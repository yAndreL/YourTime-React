import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import CalculoTrabalhistaService from '../services/CalculoTrabalhistaService';
import BatidaService from '../services/BatidaService';
import { getLocalDateString, formatDate } from '../utils/dateUtils';
import { FiPrinter, FiDownload, FiUser, FiCalendar, FiClock } from 'react-icons/fi';

function EspelhoPonto() {
  const { t } = useLanguage();
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [jornadas, setJornadas] = useState([]);
  const [batidas, setBatidas] = useState({});
  const [resumoMensal, setResumoMensal] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, superior_empresa_id, carga_horaria, nome')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin' && profile?.superior_empresa_id) {
        setIsAdmin(true);
        const { data: funcs } = await supabase
          .from('profiles')
          .select('id, nome, email, cargo, departamento, carga_horaria')
          .eq('superior_empresa_id', profile.superior_empresa_id)
          .eq('is_active', true)
          .order('nome');

        setFuncionarios(funcs || []);
      } else {
        setIsAdmin(false);
        setFuncionarios([{ id: session.user.id, nome: profile?.nome || 'Você', carga_horaria: profile?.carga_horaria }]);
        setFuncionarioSelecionado(session.user.id);
      }
    } catch (error) {
      showError('Erro ao carregar funcionários');
    }
  };

  const carregarEspelho = async () => {
    try {
      setLoading(true);
      const [ano, mes] = mesSelecionado.split('-').map(Number);
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

      const { data: jornadasData } = await supabase
        .from('jornadas')
        .select('*')
        .eq('user_id', funcionarioSelecionado)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      setJornadas(jornadasData || []);

      const { data: batidasData } = await supabase
        .from('batidas')
        .select('*')
        .eq('user_id', funcionarioSelecionado)
        .gte('timestamp_servidor', `${dataInicio}T00:00:00`)
        .lte('timestamp_servidor', `${dataFim}T23:59:59`)
        .order('timestamp_servidor', { ascending: true });

      const batidasPorDia = {};
      for (const batida of (batidasData || [])) {
        const dia = batida.timestamp_servidor.split('T')[0];
        if (!batidasPorDia[dia]) batidasPorDia[dia] = [];
        batidasPorDia[dia].push(batida);
      }
      setBatidas(batidasPorDia);

      const funcSelecionado = funcionarios.find(f => f.id === funcionarioSelecionado);
      const cargaSemanal = funcSelecionado?.carga_horaria || 40;
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasData || [], {
        carga_horaria: cargaSemanal / 5
      });
      setResumoMensal(resumo);
    } catch (error) {
      showError('Erro ao carregar espelho de ponto');
    } finally {
      setLoading(false);
    }
  };

  const obterDiasDoMes = () => {
    if (!mesSelecionado) return [];
    const [ano, mes] = mesSelecionado.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dias = [];

    for (let d = 1; d <= ultimoDia; d++) {
      const data = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(data + 'T00:00:00');
      const diaSemana = date.getDay();
      const jornada = jornadas.find(j => j.data === data);
      const batidasDia = batidas[data] || [];

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

  const diasDoMes = obterDiasDoMes();

  return (
    <MainLayout title={t('espelho.titulo') || 'Espelho de Ponto'} subtitle={t('espelho.subtitulo') || 'Relatório mensal detalhado'}>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="yt-card p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {isAdmin && (
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
              {loading ? (
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

                      return (
                        <tr key={dia.data} className={`${dia.ehFimDeSemana ? 'bg-gray-50 dark:bg-gray-800/30' : ''}`}>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className={`font-medium ${dia.ehFimDeSemana ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                              {dia.diaFormatado} {nomeDiaSemana(dia.diaSemana)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatida(entrada?.timestamp_servidor)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatida(pausa?.timestamp_servidor)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatida(retorno?.timestamp_servidor)}</td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatarHoraBatida(saida?.timestamp_servidor)}</td>
                          <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                            {dia.jornada ? BatidaService.formatarMinutosDescritivo(dia.jornada.total_minutos_trabalhados) : dia.ehFimDeSemana ? '' : '--'}
                          </td>
                          <td className="px-2 py-2">
                            {dia.jornada?.horas_extras_minutos > 0 && (
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                +{CalculoTrabalhistaService.formatarMinutos(dia.jornada.horas_extras_minutos)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {dia.jornada ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                dia.jornada.status === 'aprovada' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300' :
                                dia.jornada.status === 'fechada' ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' :
                                dia.jornada.status === 'rejeitada' ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300' :
                                'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300'
                              }`}>
                                {dia.jornada.status === 'aprovada' ? 'Aprovado' :
                                 dia.jornada.status === 'fechada' ? 'Fechado' :
                                 dia.jornada.status === 'rejeitada' ? 'Rejeitado' : 'Aberta'}
                              </span>
                            ) : dia.ehFimDeSemana ? (
                              <span className="text-xs text-gray-400">-</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">Sem registro</span>
                            )}
                            {dia.jornada?.atraso_minutos > 0 && (
                              <span className="ml-1 text-[10px] text-yellow-600 dark:text-yellow-400" title="Atraso">
                                ⚠ {BatidaService.formatarMinutosDescritivo(dia.jornada.atraso_minutos)}
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
