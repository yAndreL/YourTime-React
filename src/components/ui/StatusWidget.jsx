import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import BatidaService from '../../services/BatidaService';
import { useLanguage } from '../../hooks/useLanguage';
import { FiClock, FiPlay, FiPause, FiSquare } from 'react-icons/fi';

function StatusWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [estado, setEstado] = useState(null);
  const [minutosTrabalhadosHoje, setMinutosTrabalhadosHoje] = useState(0);
  const [batidas, setBatidas] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    carregarStatus();
    const intervalo = setInterval(carregarStatus, 30000);
    return () => {
      clearInterval(intervalo);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (estado === 'trabalhando') {
      timerRef.current = setInterval(() => {
        if (batidas.length > 0) {
          setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(batidas));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [estado, batidas]);

  const carregarStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const resultado = await BatidaService.buscarBatidasDoDia(session.user.id);
      if (resultado.success) {
        setBatidas(resultado.data);
        const estadoAtual = BatidaService.determinarEstadoJornada(resultado.data);
        setEstado(estadoAtual.estado);
        setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(resultado.data));
      }
    } catch (error) {}
  };

  const formatarTimer = (minutos) => {
    const h = Math.floor(minutos / 60);
    const m = Math.floor(minutos % 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  if (!estado || estado === 'nao_iniciada') {
    return (
      <button
        onClick={() => navigate('/batida-ponto')}
        className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <FiClock className="w-3.5 h-3.5" />
        <span>{t('batida.aguardandoInicio') || 'Sem registro hoje'}</span>
      </button>
    );
  }

  const configs = {
    trabalhando: {
      icon: FiPlay,
      cor: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300',
      pulseCor: 'bg-green-500'
    },
    em_pausa: {
      icon: FiPause,
      cor: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300',
      pulseCor: 'bg-yellow-500'
    },
    encerrada: {
      icon: FiSquare,
      cor: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
      pulseCor: null
    }
  };

  const config = configs[estado] || configs.encerrada;
  const Icon = config.icon;

  return (
    <button
      onClick={() => navigate('/batida-ponto')}
      className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.cor} hover:opacity-90 transition-colors`}
    >
      {config.pulseCor && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseCor} opacity-75`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.pulseCor}`}></span>
        </span>
      )}
      <Icon className="w-3.5 h-3.5" />
      <span>{formatarTimer(minutosTrabalhadosHoje)}</span>
    </button>
  );
}

export default StatusWidget;
