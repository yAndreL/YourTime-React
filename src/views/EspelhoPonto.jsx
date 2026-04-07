import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import CalculoTrabalhistaService from '../services/CalculoTrabalhistaService';
import BatidaService from '../services/BatidaService';
import ConfigService from '../services/ConfigService';
import {
  FUSO_PADRAO_IANA,
  obterDataCalendarioIsoDoTimestampUtc,
  obterDiaAnteriorCalendarioYmd,
  obterProximoDiaCalendarioYmd,
  obterIntervaloUtcSemiabertoParaPeriodoCalendario
} from '../utils/fusoHorarioData';
import { FiPrinter, FiDownload, FiUser, FiCalendar, FiClock, FiAlertTriangle } from 'react-icons/fi';

/**
 * Ajusta registro de jornada (tabela `jornadas`) ao dia oficial da linha do espelho:
 * quando a jornada foi gravada no dia civil da saída (+1), reutiliza esse registro nesta linha.
 */
function resolverJornadaParaDiaOficialNoEspelho(
  jornadas,
  dataOficialYmd,
  listaBatidasDia,
  fuso,
  idsJornadaJaVinculadas,
  mapaBatidasPorDiaOficial
) {
  const direta = jornadas.find(j => j.data === dataOficialYmd && !idsJornadaJaVinculadas.has(j.id));
  if (direta) return direta;
  if (!listaBatidasDia?.length) return null;
  const ultimaSaida = [...listaBatidasDia].reverse().find(b => b.tipo === 'saida');
  if (!ultimaSaida?.timestamp_servidor) return null;
  const diaCivilSaida = obterDataCalendarioIsoDoTimestampUtc(ultimaSaida.timestamp_servidor, fuso);
  if (diaCivilSaida && diaCivilSaida !== dataOficialYmd) {
    const batidasOficiaisNoDiaDaSaida = mapaBatidasPorDiaOficial[diaCivilSaida] || [];
    if (batidasOficiaisNoDiaDaSaida.length > 0) {
      return null;
    }
    return (
      jornadas.find(j => j.data === diaCivilSaida && !idsJornadaJaVinculadas.has(j.id)) ?? null
    );
  }
  return null;
}

/** Status exibido: fluxo (aprovada/rejeitada) prevalece; senão deriva das batidas. */
function resolverRotuloStatusEspelho(jornadaMetadados, listaBatidasDia) {
  if (jornadaMetadados?.status === 'aprovada' || jornadaMetadados?.status === 'rejeitada') {
    return jornadaMetadados.status;
  }
  if (listaBatidasDia?.length) {
    const { estado } = BatidaService.determinarEstadoJornada(listaBatidasDia);
    if (estado === 'encerrada') return 'fechada';
    if (estado === 'trabalhando' || estado === 'em_pausa') return 'aberta';
  }
  return jornadaMetadados?.status ?? null;
}

function EspelhoPonto() {
  const { t } = useLanguage();
  const { showError } = useToast();
  const [carregandoEspelhoPonto, setCarregandoEspelhoPonto] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [jornadas, setJornadas] = useState([]);
  const [batidas, setBatidas] = useState({});
  const [fusoCorrenteEspelho, setFusoCorrenteEspelho] = useState(FUSO_PADRAO_IANA);
  const [resumoMensal, setResumoMensal] = useState(null);
  const [ehAdministrador, setEhAdministrador] = useState(false);

  useEffect(() => {
    const hoje = new Date();
    setMesSelecionado(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
    carregarFuncionarios();
  }, []);

  useEffect(() => {
    if (funcionarioSelecionado && mesSelecionado) {
      carregarEspelho();
    }
  }, [funcionarioSelecionado, mesSelecionado]);

  const carregarFuncionarios = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: perfil } = await supabase
        .from('profiles')
        .select('role, superior_empresa_id, carga_horaria, nome')
        .eq('id', session.user.id)
        .single();

      if (perfil?.role === 'admin' && perfil?.superior_empresa_id) {
        setEhAdministrador(true);
        const { data: listaFuncionarios } = await supabase
          .from('profiles')
          .select('id, nome, email, cargo, departamento, carga_horaria')
          .eq('superior_empresa_id', perfil.superior_empresa_id)
          .eq('is_active', true)
          .order('nome');

        setFuncionarios(listaFuncionarios || []);
      } else {
        setEhAdministrador(false);
        setFuncionarios([{ id: session.user.id, nome: perfil?.nome || 'Você', carga_horaria: perfil?.carga_horaria }]);
        setFuncionarioSelecionado(session.user.id);
      }
    } catch (error) {
      showError('Erro ao carregar funcionários');
    }
  };

  const carregarEspelho = async () => {
    try {
      setCarregandoEspelhoPonto(true);
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

      const { data: dadosJornadas } = await supabase
        .from('jornadas')
        .select('*')
        .eq('user_id', funcionarioSelecionado)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      setJornadas(dadosJornadas || []);

      const resultadoFusoFuncionario = await ConfigService.buscarConfiguracoes(funcionarioSelecionado);
      const fusoDoFuncionario =
        resultadoFusoFuncionario.success && resultadoFusoFuncionario.data?.fuso_horario
          ? resultadoFusoFuncionario.data.fuso_horario
          : FUSO_PADRAO_IANA;
      setFusoCorrenteEspelho(fusoDoFuncionario);

      const dataInicioComMargem = obterDiaAnteriorCalendarioYmd(dataInicio);
      const dataFimComMargem = obterProximoDiaCalendarioYmd(dataFim);

      const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaPeriodoCalendario(
        dataInicioComMargem,
        dataFimComMargem,
        fusoDoFuncionario
      );

      const { data: dadosBatidas } = await supabase
        .from('batidas')
        .select('*')
        .eq('user_id', funcionarioSelecionado)
        .gte('timestamp_servidor', inicioUtcIso)
        .lt('timestamp_servidor', exclusivoFimUtcIso)
        .order('timestamp_servidor', { ascending: true });

      const batidasPorDia = BatidaService.agruparBatidasPorDiaOficialJornada(
        dadosBatidas || [],
        fusoDoFuncionario
      );
      setBatidas(batidasPorDia);

      const funcSelecionado = funcionarios.find(f => f.id === funcionarioSelecionado);
      const cargaSemanal = funcSelecionado?.carga_horaria || 40;
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(dadosJornadas || [], {
        carga_horaria: cargaSemanal / 5
      });
      setResumoMensal(resumo);
    } catch (error) {
      showError('Erro ao carregar espelho de ponto');
    } finally {
      setCarregandoEspelhoPonto(false);
    }
  };

  const obterDiasDoMes = () => {
    if (!mesSelecionado) return [];
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dias = [];
    const idsJornadaJaVinculadas = new Set();

    for (let d = 1; d <= ultimoDia; d++) {
      const data = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(data + 'T00:00:00');
      const diaSemana = date.getDay();
      const batidasDia = batidas[data] || [];
      let jornada = resolverJornadaParaDiaOficialNoEspelho(
        jornadas,
        data,
        batidasDia,
        fusoCorrenteEspelho,
        idsJornadaJaVinculadas,
        batidas
      );
      if (jornada) idsJornadaJaVinculadas.add(jornada.id);

      dias.push({
        data,
        diaSemana,
        ehFimDeSemana: diaSemana === 0 || diaSemana === 6,
        jornada,
        batidas: batidasDia,
        diaFormatado: String(d).padStart(2, '0')
      });
    }
    return dias;
  };

  const nomeDiaSemana = (diaSemana) => {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return nomes[diaSemana];
  };

  const formatarHoraBatida = (timestamp) => {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  /** Indica horário em dia civil diferente do dia oficial da linha (jornada cruzando meia-noite). */
  const formatarHoraBatidaComIndicadorVirada = (timestamp, diaOficialIsoYmd) => {
    if (!timestamp) return '--:--';
    const hora = formatarHoraBatida(timestamp);
    const diaDoInstante = obterDataCalendarioIsoDoTimestampUtc(timestamp, fusoCorrenteEspelho);
    if (diaDoInstante && diaOficialIsoYmd && diaDoInstante !== diaOficialIsoYmd) {
      return `${hora} (+1)`;
    }
    return hora;
  };

  const diasDoMes = obterDiasDoMes();

  const jornadaDiariaMinutosResumo = useMemo(() => {
    const func = funcionarios.find(f => f.id === funcionarioSelecionado);
    const cargaSemanal = func?.carga_horaria || 40;
    return (cargaSemanal / 5) * 60;
  }, [funcionarios, funcionarioSelecionado]);

  const contagemBatidasSemProjetoNoMes = useMemo(() => {
    if (!mesSelecionado) return 0;
    let total = 0;
    for (const chaveDia of Object.keys(batidas)) {
      if (chaveDia.slice(0, 7) !== mesSelecionado) continue;
      const listaDoDia = batidas[chaveDia] || [];
      for (const b of listaDoDia) {
        if (b.projeto_id == null || b.projeto_id === '') total += 1;
      }
    }
    return total;
  }, [batidas, mesSelecionado]);

  return (
    <MainLayout title={t('espelho.titulo') || 'Espelho de Ponto'} subtitle={t('espelho.subtitulo') || 'Relatório mensal detalhado'}>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="yt-card p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {ehAdministrador && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FiUser className="inline w-3 h-3 mr-1" />
                  Funcionário
                </label>
                <select
                  value={funcionarioSelecionado}
                  onChange={e => setFuncionarioSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg yt-field text-sm"
                >
                  <option value="">Selecione...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome} {f.cargo ? `(${f.cargo})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FiCalendar className="inline w-3 h-3 mr-1" />
                Mês/Ano
              </label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={e => setMesSelecionado(e.target.value)}
                className="px-3 py-2 border rounded-lg yt-field text-sm"
              />
            </div>
          </div>
        </div>

        {funcionarioSelecionado && contagemBatidasSemProjetoNoMes > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2 text-amber-900 dark:text-amber-100">
              <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium">
                {t('batidaProjeto.espelhoAlerta').replace('{count}', String(contagemBatidasSemProjetoNoMes))}
              </p>
            </div>
            <Link
              to={`/batidas-sem-projeto?mes=${mesSelecionado}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#8231D3] hover:bg-[#6b28b0] text-white text-sm font-semibold whitespace-nowrap"
            >
              {t('batidaProjeto.painelCta')}
            </Link>
          </div>
        )}

        {/* Resumo mensal */}
        {resumoMensal && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Trabalhado</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{resumoMensal.totalTrabalhadoFormatado}</p>
            </div>
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Extras</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{resumoMensal.totalExtrasFormatado}</p>
            </div>
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Atrasos</p>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{resumoMensal.totalAtrasoFormatado}</p>
            </div>
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Dias Trab.</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{resumoMensal.diasTrabalhados}</p>
            </div>
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Faltas</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{resumoMensal.diasFalta}</p>
            </div>
            <div className="yt-card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
              <p className={`text-lg font-bold ${resumoMensal.bancoHoras.positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {resumoMensal.bancoHoras.saldoFormatado}
              </p>
            </div>
          </div>
        )}

        {/* Tabela espelho */}
        {funcionarioSelecionado && (
          <div className="yt-card overflow-hidden">
            <div className="overflow-x-auto">
              {carregandoEspelhoPonto ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/90">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Dia</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Entrada</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Pausa</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Retorno</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Saída</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Total</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Extras</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {diasDoMes.map(dia => {
                      const entrada = dia.batidas.find(b => b.tipo === 'entrada');
                      const pausa = dia.batidas.find(b => b.tipo === 'pausa');
                      const retorno = dia.batidas.find(b => b.tipo === 'retorno');
                      const saida = dia.batidas.find(b => b.tipo === 'saida');
                      const diaTemBatidaSemProjeto = dia.batidas.some(
                        b => b.projeto_id == null || b.projeto_id === ''
                      );

                      const minutosTrabalhadosLinha =
                        dia.batidas.length > 0
                          ? Math.floor(BatidaService.calcularTempoTrabalhado(dia.batidas))
                          : Math.floor(dia.jornada?.total_minutos_trabalhados ?? 0);

                      const minutosExtrasLinha =
                        dia.batidas.length > 0
                          ? Math.floor(
                              CalculoTrabalhistaService.calcularHorasExtras(
                                minutosTrabalhadosLinha,
                                jornadaDiariaMinutosResumo
                              )
                            )
                          : Math.floor(dia.jornada?.horas_extras_minutos ?? 0);

                      const statusExibicao = resolverRotuloStatusEspelho(dia.jornada, dia.batidas);

                      const textoTotalTrabalhado =
                        dia.batidas.length > 0
                          ? BatidaService.formatarMinutosDescritivo(minutosTrabalhadosLinha)
                          : minutosTrabalhadosLinha > 0 && dia.jornada
                            ? BatidaService.formatarMinutosDescritivo(minutosTrabalhadosLinha)
                            : null;

                      return (
                        <tr
                          key={dia.data}
                          className={`${dia.ehFimDeSemana ? 'bg-gray-50 dark:bg-gray-800/30' : ''} ${
                            diaTemBatidaSemProjeto
                              ? 'bg-amber-50/90 dark:bg-amber-950/30 border-l-4 border-l-amber-500'
                              : ''
                          }`}
                        >
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              {diaTemBatidaSemProjeto && (
                                <FiAlertTriangle
                                  className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0"
                                  title={t('batidaProjeto.espelhoAlerta').replace(
                                    '{count}',
                                    String(dia.batidas.filter(b => b.projeto_id == null || b.projeto_id === '').length)
                                  )}
                                />
                              )}
                              <span className={`font-medium ${dia.ehFimDeSemana ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                {dia.diaFormatado} {nomeDiaSemana(dia.diaSemana)}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatida(entrada?.timestamp_servidor)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatidaComIndicadorVirada(pausa?.timestamp_servidor, dia.data)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatidaComIndicadorVirada(retorno?.timestamp_servidor, dia.data)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatidaComIndicadorVirada(saida?.timestamp_servidor, dia.data)}</td>
                          <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                            {textoTotalTrabalhado != null
                              ? textoTotalTrabalhado
                              : dia.ehFimDeSemana
                                ? ''
                                : '--'}
                          </td>
                          <td className="px-2 py-2">
                            {minutosExtrasLinha > 0 && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                +{CalculoTrabalhistaService.formatarMinutos(minutosExtrasLinha)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {statusExibicao ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  statusExibicao === 'aprovada'
                                    ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                                    : statusExibicao === 'fechada'
                                      ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                      : statusExibicao === 'rejeitada'
                                        ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                                        : 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300'
                                }`}
                              >
                                {statusExibicao === 'aprovada'
                                  ? 'Aprovado'
                                  : statusExibicao === 'fechada'
                                    ? 'Fechado'
                                    : statusExibicao === 'rejeitada'
                                      ? 'Rejeitado'
                                      : 'Aberta'}
                              </span>
                            ) : dia.ehFimDeSemana ? (
                              <span className="text-xs text-gray-400">-</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                Sem registro
                              </span>
                            )}
                            {dia.jornada?.atraso_minutos > 0 && (
                              <span className="ml-1 text-[10px] text-yellow-600 dark:text-yellow-400" title="Atraso">
                                {BatidaService.formatarMinutosDescritivo(dia.jornada.atraso_minutos)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default EspelhoPonto;
