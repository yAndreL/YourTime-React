import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import useBatidaPonto from '../hooks/useBatidaPonto';
import BatidaService from '../services/BatidaService';
import GeoFotoService from '../services/GeoFotoService';
import { supabase } from '../config/supabase';
import {
  obterTextoDataLocalYYYYMMDD,
  verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia,
  registrarAvisoProjetoBatidaExibidoNoDia,
  verificarSeUsuarioPossuiProjetoSelecionado,
  analisarUltimoProjetoBatidaDoArmazenamento
} from '../utils/batidaProjetoArmazenamento';
import { FiPlay, FiPause, FiSquare, FiRotateCw, FiClock, FiMapPin, FiCamera, FiCheckCircle, FiAlertCircle, FiFileText } from 'react-icons/fi';

function BatidaPonto() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const {
    batidas,
    jornadaDoDia,
    minutosTrabalhadosHoje,
    minutosPausaHoje,
    carregandoBatidas,
    enviandoRegistroBatida,
    perfilUsuario,
    baterEntrada,
    baterPausa,
    baterRetorno,
    baterSaida
  } = useBatidaPonto();

  const [geolocalizacao, setGeolocalizacao] = useState(null);
  const [erroGeo, setErroGeo] = useState(null);
  const [fotoCapturada, setFotoCapturada] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [foraDaCerca, setForaDaCerca] = useState(null);
  const [modalProjetoAberto, setModalProjetoAberto] = useState(false);
  const [pendenteBatida, setPendenteBatida] = useState(null);
  const [listaProjetosModal, setListaProjetosModal] = useState([]);
  const [carregandoProjetosModal, setCarregandoProjetosModal] = useState(false);
  const [projetoEscolhidoNaLista, setProjetoEscolhidoNaLista] = useState('');

  const sugestaoUltimoProjeto = analisarUltimoProjetoBatidaDoArmazenamento();

  const carregarProjetosParaModal = async () => {
    if (!perfilUsuario?.id) return;
    setCarregandoProjetosModal(true);
    try {
      const idEmpresaSuperior = perfilUsuario.superior_empresa_id;
      let consulta = supabase.from('projetos').select('id, nome, empresa_id').eq('status', 'ativo').order('nome');
      if (idEmpresaSuperior) {
        consulta = consulta.or(`superior_empresa_id.eq.${idEmpresaSuperior},superior_empresa_id.is.null`);
      }
      const { data, error } = await consulta;
      if (!error) setListaProjetosModal(data || []);
    } finally {
      setCarregandoProjetosModal(false);
    }
  };

  const fecharModalProjeto = () => {
    setModalProjetoAberto(false);
    setPendenteBatida(null);
    setProjetoEscolhidoNaLista('');
  };

  const marcarDiaEFecharEExecutar = async (funcaoBatida, tipoBatida) => {
    registrarAvisoProjetoBatidaExibidoNoDia(obterTextoDataLocalYYYYMMDD());
    fecharModalProjeto();
    await executarBatida(funcaoBatida, tipoBatida);
  };

  const iniciarFluxoBatida = (funcaoBatida, tipoBatida) => {
    const dataStr = obterTextoDataLocalYYYYMMDD();
    if (verificarSeUsuarioPossuiProjetoSelecionado()) {
      void executarBatida(funcaoBatida, tipoBatida);
      return;
    }
    if (verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia(dataStr)) {
      void executarBatida(funcaoBatida, tipoBatida);
      return;
    }
    setPendenteBatida({ funcaoBatida, tipoBatida });
    setProjetoEscolhidoNaLista('');
    setModalProjetoAberto(true);
    void carregarProjetosParaModal();
  };

  const usarSugestaoUltimoProjetoEExecutar = async () => {
    if (!sugestaoUltimoProjeto?.id || !pendenteBatida) return;
    localStorage.setItem(
      'selectedProject',
      JSON.stringify({
        id: sugestaoUltimoProjeto.id,
        nome: sugestaoUltimoProjeto.nome || '',
        empresa_id: sugestaoUltimoProjeto.empresa_id ?? null,
        horasTrabalhadas: '0',
        horasPendentesAprovacao: '0',
        horasTotais: '0',
        horasPendentes: '0'
      })
    );
    await marcarDiaEFecharEExecutar(pendenteBatida.funcaoBatida, pendenteBatida.tipoBatida);
  };

  const aplicarProjetoDaListaEExecutar = async () => {
    const id = projetoEscolhidoNaLista;
    if (!id || !pendenteBatida) return;
    const projeto = listaProjetosModal.find(p => p.id === id);
    if (!projeto) return;
    localStorage.setItem(
      'selectedProject',
      JSON.stringify({
        id: projeto.id,
        nome: projeto.nome || '',
        empresa_id: projeto.empresa_id ?? null,
        horasTrabalhadas: '0',
        horasPendentesAprovacao: '0',
        horasTotais: '0',
        horasPendentes: '0'
      })
    );
    await marcarDiaEFecharEExecutar(pendenteBatida.funcaoBatida, pendenteBatida.tipoBatida);
  };

  const continuarSemProjetoDoModal = async () => {
    if (!pendenteBatida) return;
    await marcarDiaEFecharEExecutar(pendenteBatida.funcaoBatida, pendenteBatida.tipoBatida);
  };

  const executarBatida = async (funcaoBatida, tipoBatida) => {
    setProcessando(true);
    setForaDaCerca(null);

    try {
      const [geo, fotoBlob] = await Promise.all([
        GeoFotoService.capturarGeolocalizacao(),
        GeoFotoService.capturarFoto()
      ]);

      if (geo.latitude) {
        setGeolocalizacao(geo);
        setErroGeo(null);
      } else {
        setErroGeo(t('batida.geoError'));
      }

      if (perfilUsuario?.superior_empresa_id && geo.latitude) {
        const cerca = await GeoFotoService.buscarConfigCercaVirtual(perfilUsuario.superior_empresa_id);
        if (cerca) {
          const resultado = GeoFotoService.verificarDentroDaCerca(
            geo.latitude, geo.longitude,
            cerca.latitude, cerca.longitude,
            cerca.raioMetros
          );
          if (resultado && !resultado.dentroDoRaio) {
            setForaDaCerca(resultado);
          }
        }
      }

      let fotoUrl = null;
      if (fotoBlob && perfilUsuario?.id) {
        fotoUrl = await GeoFotoService.uploadFotoBatida(perfilUsuario.id, fotoBlob);
        if (fotoUrl) setFotoCapturada(true);
      }

      const resultado = await funcaoBatida({
        latitude: geo.latitude,
        longitude: geo.longitude,
        precisaoGps: geo.precisaoGps,
        fotoUrl
      });

      if (resultado.success) {
        showSuccess(t(`batida.${tipoBatida}Sucesso`));
      } else {
        showError(resultado.error || t('batida.erroGenerico'));
      }
    } finally {
      setProcessando(false);
    }
  };

  const obterConfiguracaoBotao = () => {
    switch (jornadaDoDia.estado) {
      case 'nao_iniciada':
        return {
          label: t('batida.iniciarJornada'),
          icon: FiPlay,
          cor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          corTexto: 'text-white',
          acao: () => iniciarFluxoBatida(baterEntrada, 'entrada'),
          tamanho: 'w-48 h-48'
        };
      case 'trabalhando':
        return {
          label: t('batida.registrarPausa'),
          sublabel: t('batida.ouEncerrar'),
          icon: FiPause,
          cor: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
          corTexto: 'text-white',
          acao: () => iniciarFluxoBatida(baterPausa, 'pausa'),
          acaoSecundaria: () => iniciarFluxoBatida(baterSaida, 'saida'),
          tamanho: 'w-48 h-48'
        };
      case 'em_pausa':
        return {
          label: t('batida.retomar'),
          icon: FiRotateCw,
          cor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          corTexto: 'text-white',
          acao: () => iniciarFluxoBatida(baterRetorno, 'retorno'),
          tamanho: 'w-48 h-48'
        };
      case 'encerrada':
        return {
          label: t('batida.jornadaEncerrada'),
          icon: FiCheckCircle,
          cor: 'bg-gray-400 cursor-default',
          corTexto: 'text-white',
          acao: null,
          tamanho: 'w-48 h-48'
        };
      default:
        return null;
    }
  };

  const configuracao = obterConfiguracaoBotao();

  const formatarHoraMinuto = (minutos) => {
    const h = Math.floor(minutos / 60);
    const m = Math.floor(minutos % 60);
    const s = Math.floor((minutos * 60) % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const obterCorStatus = () => {
    switch (jornadaDoDia.estado) {
      case 'trabalhando': return 'text-green-600 dark:text-green-400';
      case 'em_pausa': return 'text-yellow-600 dark:text-yellow-400';
      case 'encerrada': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const obterTextoStatus = () => {
    switch (jornadaDoDia.estado) {
      case 'nao_iniciada': return t('batida.aguardandoInicio');
      case 'trabalhando': return t('batida.emTrabalho');
      case 'em_pausa': return t('batida.emPausa');
      case 'encerrada': return t('batida.jornadaFinalizada');
      default: return '';
    }
  };

  if (carregandoBatidas) {
    return (
      <MainLayout title={t('batida.titulo')} subtitle={t('batida.subtitulo')}>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={t('batida.titulo')} subtitle={perfilUsuario ? `${t('formularioPonto.hello')}, ${perfilUsuario.nome}` : ''}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status e Timer */}
        <div className="yt-card p-6 text-center">
          <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${obterCorStatus()}`}>
            {obterTextoStatus()}
          </div>
          <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white mb-4">
            {formatarHoraMinuto(minutosTrabalhadosHoje)}
          </div>
          <div className="flex justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              <span>{t('batida.trabalhado')}: {BatidaService.formatarMinutosDescritivo(Math.floor(minutosTrabalhadosHoje))}</span>
            </div>
            {minutosPausaHoje > 0 && (
              <div className="flex items-center gap-1">
                <FiPause className="w-4 h-4" />
                <span>{t('batida.pausas')}: {BatidaService.formatarMinutosDescritivo(Math.floor(minutosPausaHoje))}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botao Principal */}
        <div className="flex flex-col items-center gap-4">
          {configuracao && (
            <>
              <button
                type="button"
                onClick={configuracao.acao}
                disabled={enviandoRegistroBatida || !configuracao.acao || processando}
                className={`${configuracao.tamanho} rounded-full ${configuracao.cor} ${configuracao.corTexto} flex flex-col items-center justify-center shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4`}
              >
                {enviandoRegistroBatida || processando ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                ) : (
                  <>
                    <configuracao.icon className="w-16 h-16 mb-2" />
                    <span className="text-lg font-bold">{configuracao.label}</span>
                  </>
                )}
              </button>

              {configuracao.acaoSecundaria && (
                <button
                  type="button"
                  onClick={configuracao.acaoSecundaria}
                  disabled={enviandoRegistroBatida || processando}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <FiSquare className="w-5 h-5" />
                  {t('batida.encerrarJornada')}
                </button>
              )}
            </>
          )}
        </div>

        {/* Geolocalização status */}
        {erroGeo && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-400 rounded-lg flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-200">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{erroGeo}</span>
          </div>
        )}

        {geolocalizacao && (
          <div className="p-3 bg-green-50 dark:bg-green-950/40 border-l-4 border-green-400 rounded-lg flex items-center gap-2 text-sm text-green-700 dark:text-green-200">
            <FiMapPin className="w-4 h-4 flex-shrink-0" />
            <span>{t('batida.localizacaoCapturada')}</span>
          </div>
        )}

        {fotoCapturada && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-400 rounded-lg flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200">
            <FiCamera className="w-4 h-4 flex-shrink-0" />
            <span>{t('batida.fotoCapturada') || 'Foto capturada com sucesso'}</span>
          </div>
        )}

        {foraDaCerca && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-200">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{t('batida.foraDaCerca') || `Você está a ${foraDaCerca.distanciaMetros}m do local de trabalho (limite: ${foraDaCerca.raioMetros}m)`}</span>
          </div>
        )}

        {/* Timeline de Batidas do Dia */}
        {batidas.length > 0 && (
          <div className="yt-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiClock className="w-4 h-4" />
              {t('batida.registrosHoje')}
            </h3>
            <div className="space-y-3">
              {batidas.map((batida, indice) => {
                const hora = new Date(batida.timestamp_servidor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const iconesPorTipo = {
                  entrada: { icon: FiPlay, cor: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300', label: t('batida.entrada') },
                  pausa: { icon: FiPause, cor: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300', label: t('batida.pausa') },
                  retorno: { icon: FiRotateCw, cor: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300', label: t('batida.retorno') },
                  saida: { icon: FiSquare, cor: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300', label: t('batida.saida') }
                };
                const configuracao = iconesPorTipo[batida.tipo] || iconesPorTipo.entrada;
                const Icon = configuracao.icon;

                return (
                  <div key={batida.id || indice} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${configuracao.cor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{configuracao.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{hora}</div>
                    </div>
                    {batida.latitude && batida.longitude && (
                      <FiMapPin className="w-4 h-4 text-gray-400" title={t('batida.comLocalizacao')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link para formulário retroativo */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/formulario-ponto')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1 mx-auto"
          >
            <FiFileText className="w-4 h-4" />
            {t('batida.registroRetroativo')}
          </button>
        </div>
      </div>

      <Modal isOpen={modalProjetoAberto} onClose={fecharModalProjeto} title={t('batidaProjeto.modalTitulo')} type="info">
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-200">{t('batidaProjeto.modalTexto')}</p>

          {sugestaoUltimoProjeto?.id && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/80 dark:bg-purple-950/30 p-3">
              <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-1">{t('batidaProjeto.ultimoProjetoSugerido')}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{sugestaoUltimoProjeto.nome || `ID ${sugestaoUltimoProjeto.id}`}</p>
              <button
                type="button"
                disabled={processando || !pendenteBatida}
                onClick={() => void usarSugestaoUltimoProjetoEExecutar()}
                className="w-full py-2 rounded-lg bg-[#8231D3] hover:bg-[#6b28b0] text-white text-sm font-semibold disabled:opacity-50"
              >
                {t('batidaProjeto.usarSugestao')}
              </button>
            </div>
          )}

          {!sugestaoUltimoProjeto?.id && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('batidaProjeto.nenhumaSugestao')}</p>
          )}

          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t('batidaProjeto.escolherDaLista')}</p>
            {carregandoProjetosModal ? (
              <p className="text-sm text-gray-500">{t('batidaProjeto.carregandoProjetos')}</p>
            ) : (
              <>
                <select
                  value={projetoEscolhidoNaLista}
                  onChange={e => setProjetoEscolhidoNaLista(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg yt-field text-sm mb-2"
                >
                  <option value="">{t('batidaProjeto.selecioneProjeto')}</option>
                  {listaProjetosModal.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={processando || !pendenteBatida || !projetoEscolhidoNaLista}
                  onClick={() => void aplicarProjetoDaListaEExecutar()}
                  className="w-full py-2 rounded-lg border-2 border-[#8231D3] text-[#8231D3] dark:text-purple-300 dark:border-purple-400 text-sm font-semibold disabled:opacity-50"
                >
                  {t('batidaProjeto.aplicarProjetoERegistrar')}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={processando || !pendenteBatida}
            onClick={() => void continuarSemProjetoDoModal()}
            className="w-full py-2.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            {t('batidaProjeto.continuarSemProjeto')}
          </button>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default BatidaPonto;
