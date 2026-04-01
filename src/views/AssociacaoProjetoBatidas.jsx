import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../hooks/useLanguage';
import { useFusoHorario } from '../hooks/useFusoHorario.jsx';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import BatidaService from '../services/BatidaService';
import { extrairIntervaloCustomDaUrl } from '../utils/intervaloUrlBatidasSemProjeto';
import { registrarMetricaProdutoBatidas } from '../utils/metricaProdutoBatidas';
import { FiTarget, FiAlertCircle } from 'react-icons/fi';

function AssociacaoProjetoBatidas() {
  const { t } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const hoje = new Date();
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const intervaloConsulta = useMemo(() => {
    const custom = extrairIntervaloCustomDaUrl(searchParams);
    if (custom) return custom;
    const mes = searchParams.get('mes');
    const mesOk = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : mesPadrao;
    const [ano, mesNum] = mesOk.split('-').map(Number);
    return BatidaService.obterIntervaloDoMesFormatado(ano, mesNum);
  }, [searchParams, mesPadrao]);

  const intervaloCustomUrl = useMemo(() => extrairIntervaloCustomDaUrl(searchParams), [searchParams]);

  const valorMesNoInput = useMemo(() => {
    if (intervaloCustomUrl) return intervaloCustomUrl.dataInicio.slice(0, 7);
    const mes = searchParams.get('mes');
    if (mes && /^\d{4}-\d{2}$/.test(mes)) return mes;
    return mesPadrao;
  }, [searchParams, mesPadrao, intervaloCustomUrl]);

  const [listaBatidas, setListaBatidas] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [listaProjetos, setListaProjetos] = useState([]);
  const [idUsuario, setIdUsuario] = useState(null);
  const [batidaEmEdicao, setBatidaEmEdicao] = useState(null);
  const [projetoSelecionadoModal, setProjetoSelecionadoModal] = useState('');
  const [salvandoAssociacao, setSalvandoAssociacao] = useState(false);
  /** Uma única carga por abertura do modal (evita refetch a cada render). */
  const [previewAssociacao, setPreviewAssociacao] = useState(null);

  const carregarProjetosUsuario = useCallback(async userId => {
    const { data: perfil } = await supabase.from('profiles').select('superior_empresa_id').eq('id', userId).maybeSingle();
    const idEmpresaSuperior = perfil?.superior_empresa_id;
    let consulta = supabase.from('projetos').select('id, nome, empresa_id').eq('status', 'ativo').order('nome');
    if (idEmpresaSuperior) {
      consulta = consulta.or(`superior_empresa_id.eq.${idEmpresaSuperior},superior_empresa_id.is.null`);
    }
    const { data, error } = await consulta;
    if (error) throw error;
    setListaProjetos(data || []);
  }, []);

  const carregarBatidas = useCallback(async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    setIdUsuario(user.id);
    setCarregandoLista(true);
    try {
      await carregarProjetosUsuario(user.id);
      const { dataInicio, dataFim } = intervaloConsulta;
      const resultado = await BatidaService.listarBatidasSemProjetoDoUsuario(
        user.id,
        dataInicio,
        dataFim,
        fusoHorario
      );
      if (resultado.success) {
        setListaBatidas(resultado.data);
      } else {
        showError(resultado.error || t('comum.error'));
        setListaBatidas([]);
      }
    } catch (e) {
      showError(e.message || t('comum.error'));
      setListaBatidas([]);
    } finally {
      setCarregandoLista(false);
    }
  }, [intervaloConsulta, carregarProjetosUsuario, showError, t, fusoHorario]);

  useEffect(() => {
    carregarBatidas();
  }, [carregarBatidas]);

  const aoAlterarMesReferencia = valorMes => {
    setSearchParams(
      prev => {
        const p = new URLSearchParams(prev);
        p.delete('dataInicio');
        p.delete('dataFim');
        p.set('mes', valorMes);
        return p;
      },
      { replace: true }
    );
  };

  const rotuloTipoBatida = tipo => {
    const chave = `batida.${tipo}`;
    const texto = t(chave);
    return texto === chave ? tipo : texto;
  };

  const abrirModalAssociar = batida => {
    setBatidaEmEdicao(batida);
    setProjetoSelecionadoModal('');
    setPreviewAssociacao(null);
  };

  const fecharModalAssociar = () => {
    setBatidaEmEdicao(null);
    setProjetoSelecionadoModal('');
    setPreviewAssociacao(null);
  };

  useEffect(() => {
    if (!batidaEmEdicao?.id || !idUsuario) {
      if (!batidaEmEdicao) setPreviewAssociacao(null);
      return undefined;
    }
    let cancelado = false;
    setPreviewAssociacao({ carregando: true });
    BatidaService.obterPreviewSegmentoParaAssociacao(idUsuario, batidaEmEdicao.id).then(res => {
      if (cancelado) return;
      if (res.success) {
        setPreviewAssociacao({ carregando: false, dados: res });
      } else {
        setPreviewAssociacao({ carregando: false, erro: res.error || t('comum.error') });
      }
    });
    return () => {
      cancelado = true;
    };
  }, [batidaEmEdicao?.id, idUsuario, t]);

  const confirmarAssociacao = async () => {
    if (!batidaEmEdicao || !idUsuario || !projetoSelecionadoModal) {
      showError(t('batidaProjeto.selecioneProjeto'));
      return;
    }
    setSalvandoAssociacao(true);
    try {
      const resultado = await BatidaService.associarProjetoNaBatidaDoProprioUsuario(
        batidaEmEdicao.id,
        idUsuario,
        projetoSelecionadoModal
      );
      if (resultado.conflitoParcial) {
        showError(t('batidaProjeto.conflitoParcialAssociacao'));
        fecharModalAssociar();
        await carregarBatidas();
        return;
      }
      if (resultado.success) {
        const q = resultado.quantidadeAssociadas ?? 1;
        registrarMetricaProdutoBatidas('associacao_projeto_segmento', { quantidadeBatidas: q });
        if (q > 1) {
          showSuccess(t('batidaProjeto.sucessoAssociacaoVarias').replace('{count}', String(q)));
        } else {
          showSuccess(t('batidaProjeto.sucessoAssociacao'));
        }
        fecharModalAssociar();
        await carregarBatidas();
      } else {
        const mensagem =
          resultado.error === 'CONFLITO_PARCIAL_ASSOCIACAO'
            ? t('batidaProjeto.conflitoParcialAssociacao')
            : resultado.error || t('comum.error');
        showError(mensagem);
      }
    } finally {
      setSalvandoAssociacao(false);
    }
  };

  const textoPeriodoListagem = intervaloCustomUrl
    ? t('batidaProjeto.listagemPeriodoEntre')
        .replace('{dataInicio}', intervaloCustomUrl.dataInicio)
        .replace('{dataFim}', intervaloCustomUrl.dataFim)
    : null;

  return (
    <MainLayout title={t('batidaProjeto.tituloPagina')} subtitle={t('batidaProjeto.subtituloPagina')}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="yt-card p-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('batidaProjeto.periodoMes')}
            </label>
            <input
              type="month"
              value={valorMesNoInput}
              onChange={e => aoAlterarMesReferencia(e.target.value)}
              className="px-3 py-2 border rounded-lg yt-field text-sm"
            />
            {intervaloCustomUrl && textoPeriodoListagem && (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200 font-medium">{textoPeriodoListagem}</p>
            )}
          </div>
          <Link
            to="/batida-ponto"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <FiTarget className="w-4 h-4" />
            {t('menuPrincipal.timeRecord')}
          </Link>
        </div>

        <div className="yt-card overflow-hidden">
          {carregandoLista ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : listaBatidas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
              <FiAlertCircle className="w-8 h-8 text-yellow-500" />
              {t('batidaProjeto.listaVazia')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/90">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {t('batidaProjeto.colunaDataHora')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">
                      {t('batidaProjeto.colunaTipo')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">
                      {t('batidaProjeto.associarProjeto')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {listaBatidas.map(batida => (
                    <tr key={batida.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                        {new Date(batida.timestamp_servidor).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'medium'
                        })}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{rotuloTipoBatida(batida.tipo)}</td>
                      <td className="px-4 py-3 text-right">
                        {BatidaService.verificarSeBatidaPermiteAssociarProjeto(batida) ? (
                          <button
                            type="button"
                            onClick={() => abrirModalAssociar(batida)}
                            className="px-3 py-1.5 rounded-lg bg-[#8231D3] hover:bg-[#6b28b0] text-white text-xs font-semibold transition-colors"
                          >
                            {t('batidaProjeto.associarProjeto')}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">{t('comum.warning')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!batidaEmEdicao} onClose={fecharModalAssociar} title={t('batidaProjeto.associarProjeto')}>
        <div className="space-y-4 p-1">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {batidaEmEdicao &&
              new Date(batidaEmEdicao.timestamp_servidor).toLocaleString(undefined, {
                dateStyle: 'full',
                timeStyle: 'short'
              })}
          </p>

          <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {t('batidaProjeto.modalResumoLoteTitulo')}
            </p>
            {previewAssociacao?.carregando && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('batidaProjeto.previewCarregando')}</p>
            )}
            {previewAssociacao?.erro && (
              <p className="text-xs text-red-600 dark:text-red-400">{previewAssociacao.erro}</p>
            )}
            {previewAssociacao?.dados && (
              <>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {t('batidaProjeto.modalResumoQuantidade').replace(
                    '{count}',
                    String(previewAssociacao.dados.quantidadeElegivel)
                  )}
                </p>
                {previewAssociacao.dados.dataMinIso && previewAssociacao.dados.dataMaxIso && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {t('batidaProjeto.modalResumoIntervalo')
                      .replace(
                        '{inicio}',
                        new Date(previewAssociacao.dados.dataMinIso).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      )
                      .replace(
                        '{fim}',
                        new Date(previewAssociacao.dados.dataMaxIso).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      )}
                  </p>
                )}
                {previewAssociacao.dados.abertoSemSaida && (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 border-l-4 border-amber-500 pl-2">
                    {t('batidaProjeto.avisoBlocoJornadaSemSaida')}
                  </p>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t('batidaProjeto.modalDicaSegmento')}</p>
          <select
            value={projetoSelecionadoModal}
            onChange={e => setProjetoSelecionadoModal(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg yt-field text-sm"
          >
            <option value="">{t('batidaProjeto.selecioneProjeto')}</option>
            {listaProjetos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={fecharModalAssociar}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              {t('comum.cancel')}
            </button>
            <button
              type="button"
              disabled={
                salvandoAssociacao ||
                !projetoSelecionadoModal ||
                previewAssociacao?.carregando ||
                (previewAssociacao?.dados != null && previewAssociacao.dados.quantidadeElegivel === 0)
              }
              onClick={confirmarAssociacao}
              className="px-4 py-2 rounded-lg bg-[#f5140a] hover:bg-[#c41008] text-white font-semibold disabled:opacity-50"
            >
              {t('batidaProjeto.salvarAssociacao')}
            </button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default AssociacaoProjetoBatidas;
