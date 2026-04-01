import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase.js';
import { useLanguage } from './useLanguage.jsx';
import { useFusoHorario } from './useFusoHorario.jsx';
import { obterDataCalendarioIsoNoFuso } from '../utils/fusoHorarioData';
import BatidaService from '../services/BatidaService.js';
export function useTimeTracking() {
  const {
    t
  } = useLanguage();
  const { fusoHorario } = useFusoHorario();
  const [dadosPerfilUsuario, setDadosPerfilUsuario] = useState(null);
  const [registrosApontamento, setRegistrosApontamento] = useState([]);
  const [carregandoDadosApontamento, setCarregandoDadosApontamento] = useState(true);
  /** Erro ao carregar perfil — bloqueia cartões do dashboard */
  const [mensagemErroPerfilUsuario, setMensagemErroPerfilUsuario] = useState(null);
  /** Erro ao carregar tabela agendamento — não deve esconder o dashboard inteiro */
  const [mensagemErroRegistros, setMensagemErroRegistros] = useState(null);
  /** Minutos trabalhados hoje via batidas (ponto em tempo real), alinhado ao StatusWidget */
  const [minutosTrabalhadosHojeNasBatidas, setMinutosTrabalhadosHojeNasBatidas] = useState(0);
  useEffect(() => {
    const registrosApontamentoEmCache = sessionStorage.getItem('cachedTimeRecords');
    if (registrosApontamentoEmCache) {
      try {
        const dadosParseados = JSON.parse(registrosApontamentoEmCache);
        setRegistrosApontamento(dadosParseados);
        setCarregandoDadosApontamento(false);
      } catch (e) {}
    }
  }, []);
  const fetchDadosPerfilUsuario = async () => {
    try {
      const temCache = sessionStorage.getItem('cachedTimeRecords');
      if (!temCache) {
        setCarregandoDadosApontamento(true);
      }
      setMensagemErroPerfilUsuario(null);
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      const {
        data: profile,
        error: userError
      } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (userError) {
        throw userError;
      }
      if (profile) {
        setDadosPerfilUsuario(profile);
      } else {
        setDadosPerfilUsuario({
          id: user.id
        });
      }
    } catch (err) {
      setMensagemErroPerfilUsuario(`Erro ao buscar dados do usuário: ${err.message}`);
      setDadosPerfilUsuario(null);
    } finally {
      setCarregandoDadosApontamento(false);
    }
  };
  const formatarDataParaConsultaSql = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const fetchRegistrosApontamento = async () => {
    try {
      if (!dadosPerfilUsuario?.id) {
        return;
      }
      const hoje = new Date();
      const dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - 90);
      dataInicio.setHours(0, 0, 0, 0);
      const {
        data: registros,
        error: erroRegistros
      } = await supabase.from('agendamento').select('*').eq('user_id', dadosPerfilUsuario.id).gte('data', formatarDataParaConsultaSql(dataInicio)).order('data', {
        ascending: true
      });
      if (erroRegistros) {
        throw erroRegistros;
      }
      setRegistrosApontamento(registros || []);
      sessionStorage.setItem('cachedTimeRecords', JSON.stringify(registros || []));
      setMensagemErroRegistros(null);
      try {
        const resultadoBatidas = await BatidaService.buscarBatidasDoDia(
          dadosPerfilUsuario.id,
          null,
          fusoHorario
        );
        const batidasDoDia = resultadoBatidas.success ? resultadoBatidas.data || [] : [];
        setMinutosTrabalhadosHojeNasBatidas(BatidaService.calcularTempoTrabalhado(batidasDoDia));
      } catch {
        setMinutosTrabalhadosHojeNasBatidas(0);
      }
    } catch (err) {
      setMensagemErroRegistros(`Erro ao buscar registros: ${err.message}`);
      setRegistrosApontamento([]);
      setMinutosTrabalhadosHojeNasBatidas(0);
    }
  };
  const calcularSaldoHorasRegistros = () => {
    const registrosValidos = registrosApontamento.filter(record => record.status !== 'R');
    if (!registrosValidos.length) return '+00:00';
    let totalMinutes = 0;
    registrosValidos.forEach(record => {
      const workedMinutes = calcularMinutosTrabalhadosNoRegistroDia(record);
      totalMinutes += workedMinutes;
    });
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const minutes = Math.abs(totalMinutes) % 60;
    const sign = totalMinutes >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  const calcularMinutosTrabalhadosNoRegistroDia = record => {
    let totalMinutes = 0;
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`);
      const saida1 = new Date(`2000-01-01T${record.saida1}`);
      totalMinutes += (saida1 - entrada1) / (1000 * 60);
    }
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`);
      const saida2 = new Date(`2000-01-01T${record.saida2}`);
      totalMinutes += (saida2 - entrada2) / (1000 * 60);
    }
    return totalMinutes;
  };
  const calcularHorasHojeAprovadas = () => {
    const hoje = obterDataCalendarioIsoNoFuso(new Date(), fusoHorario);
    const todayRecords = registrosApontamento.filter(record => record.data === hoje && record.status === 'A');
    const minutosApontamentosAprovados = todayRecords.reduce(
      (sum, record) => sum + calcularMinutosTrabalhadosNoRegistroDia(record),
      0
    );
    const totalMinutes = minutosApontamentosAprovados + minutosTrabalhadosHojeNasBatidas;
    if (totalMinutes <= 0) return '00:00';
    const totalArredondado = Math.round(totalMinutes);
    const hours = Math.floor(totalArredondado / 60);
    const mins = totalArredondado % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  const calcularHorasHojePendentes = () => {
    const hoje = obterDataCalendarioIsoNoFuso(new Date(), fusoHorario);
    const pendingRecords = registrosApontamento.filter(record => record.data === hoje && record.status === 'P');
    if (!pendingRecords.length) return '00:00';
    const totalMinutes = pendingRecords.reduce((sum, record) => sum + calcularMinutosTrabalhadosNoRegistroDia(record), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  const verificarSeEstaTrabalhandoAgora = () => {
    const hoje = obterDataCalendarioIsoNoFuso(new Date(), fusoHorario);
    const registroHoje = registrosApontamento.find(r => r.data === hoje && r.status !== 'R');
    if (!registroHoje) return { isWorking: false, status: t('painel.noRecord') };
    if (registroHoje.entrada1 && !registroHoje.saida1) {
      return { isWorking: true, status: t('painel.working') };
    }
    if (registroHoje.saida1 && !registroHoje.entrada2) {
      return { isWorking: false, status: t('painel.onBreak') };
    }
    if (registroHoje.entrada2 && !registroHoje.saida2) {
      return { isWorking: true, status: t('painel.working') };
    }
    if (registroHoje.saida2) {
      return { isWorking: false, status: t('painel.dayCompleted') };
    }
    return { isWorking: false, status: t('painel.noRecord') };
  };
  const obterDadosResumoDashboard = () => {
    const statusAtual = verificarSeEstaTrabalhandoAgora();
    return {
      saldoHoras: calcularSaldoHorasRegistros(),
      horasHoje: calcularHorasHojeAprovadas(),
      horasPendentes: calcularHorasHojePendentes(),
      status: statusAtual.status,
      isWorking: statusAtual.isWorking,
      registrosApontamento: registrosApontamento
    };
  };
  const obterDadosGraficoSemanal = () => {
    const diasSemana = [t('painel.monday'), t('painel.tuesday'), t('painel.wednesday'), t('painel.thursday'), t('painel.friday'), t('painel.saturday'), t('painel.sunday')];
    const hoje = new Date();
    const dayOfWeek = hoje.getDay();
    const startOfWeek = new Date(hoje);
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(hoje.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const weekRecords = registrosApontamento.filter(r => {
      const recordDate = new Date(r.data + 'T00:00:00');
      const isInWeek = recordDate >= startOfWeek && recordDate <= endOfWeek;
      const isApprovedOrPending = r.status === 'A' || r.status === 'P';
      return isInWeek && isApprovedOrPending;
    });
    const todayYear = hoje.getFullYear();
    const todayMonth = String(hoje.getMonth() + 1).padStart(2, '0');
    const todayDay = String(hoje.getDate()).padStart(2, '0');
    const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
    return diasSemana.map((day, index) => {
      const targetDate = new Date(startOfWeek);
      targetDate.setDate(startOfWeek.getDate() + index);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      const record = weekRecords.find(r => r.data === dateStr);
      const minutes = record ? calcularMinutosTrabalhadosNoRegistroDia(record) : 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const isToday = dateStr === todayStr;
      return {
        dia: day,
        horas: minutes > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : '0:00',
        entrada: record?.entrada1 || '--:--',
        saida: record?.saida2 || record?.saida1 || '--:--',
        isToday: isToday,
        status: record?.status || null
      };
    });
  };
  const registrarRegistroApontamento = async dadosHorario => {
    try {
      if (!dadosPerfilUsuario?.id) {
        throw new Error('Usuário não identificado');
      }
      const {
        data,
        error
      } = await supabase.from('agendamento').insert([{
        user_id: dadosPerfilUsuario.id,
        ...dadosHorario
      }]).select();
      if (error) throw error;
      await fetchRegistrosApontamento();
      return {
        success: true,
        data
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  };
  useEffect(() => {
    fetchDadosPerfilUsuario();
  }, []);
  useEffect(() => {
    if (dadosPerfilUsuario?.id) {
      fetchRegistrosApontamento();
    }
  }, [dadosPerfilUsuario, fusoHorario]);
  const dadosResumoDashboard = useMemo(
    () => obterDadosResumoDashboard(),
    [registrosApontamento, minutosTrabalhadosHojeNasBatidas, t, fusoHorario]
  );
  const dadosGraficoSemanal = useMemo(() => obterDadosGraficoSemanal(), [registrosApontamento, t, fusoHorario]);
  const mensagemErroApontamento = useMemo(() => {
    const partes = [mensagemErroPerfilUsuario, mensagemErroRegistros].filter(Boolean);
    return partes.length ? partes.join(' | ') : null;
  }, [mensagemErroPerfilUsuario, mensagemErroRegistros]);
  return {
    dadosPerfilUsuario,
    registrosApontamento,
    carregandoDadosApontamento,
    mensagemErroPerfilUsuario,
    mensagemErroRegistros,
    mensagemErroApontamento,
    dadosResumoDashboard,
    dadosGraficoSemanal,
    registrarRegistroApontamento,
    recarregarRegistrosApontamento: fetchRegistrosApontamento
  };
}
export default useTimeTracking;
