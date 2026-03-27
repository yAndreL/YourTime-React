import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import BatidaService from '../services/BatidaService';
import OfflineService from '../services/OfflineService';

export function useBatidaPonto() {
  const [batidas, setBatidas] = useState([]);
  const [estado, setEstado] = useState({ estado: 'nao_iniciada', proximaBatida: 'entrada' });
  const [minutosTrabalhadosHoje, setMinutosTrabalhadosHoje] = useState(0);
  const [minutosPausaHoje, setMinutosPausaHoje] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    carregarDadosIniciais();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (estado.estado === 'trabalhando' || estado.estado === 'em_pausa') {
      timerRef.current = setInterval(() => {
        if (batidas.length > 0) {
          setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(batidas));
          setMinutosPausaHoje(BatidaService.calcularTempoPausa(batidas));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [estado.estado, batidas]);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, email, superior_empresa_id, carga_horaria')
        .eq('id', user.id)
        .single();

      setProfileData(profile);
      await carregarBatidasDoDia(user.id);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarBatidasDoDia = async (uid = null) => {
    const id = uid || userId;
    if (!id) return;

    const resultado = await BatidaService.buscarBatidasDoDia(id);
    if (resultado.success) {
      setBatidas(resultado.data);
      const estadoAtual = BatidaService.determinarEstadoJornada(resultado.data);
      setEstado(estadoAtual);
      setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(resultado.data));
      setMinutosPausaHoje(BatidaService.calcularTempoPausa(resultado.data));
    }
  };

  const registrarBatida = useCallback(async (tipo, { latitude, longitude, precisaoGps, fotoUrl = null, observacao } = {}) => {
    if (!userId || registrando) return { success: false, error: 'Operação indisponível' };

    setRegistrando(true);
    try {
      const projetoSalvo = localStorage.getItem('selectedProject');
      let projetoId = null;
      let empresaId = null;

      if (projetoSalvo) {
        try {
          const projeto = JSON.parse(projetoSalvo);
          projetoId = projeto.id;
          if (projeto.empresa_id) empresaId = projeto.empresa_id;
        } catch (e) {}
      }

      if (!OfflineService.estaOnline()) {
        const batidaOffline = {
          user_id: userId,
          tipo,
          timestamp_servidor: new Date().toISOString(),
          timestamp_cliente: new Date().toISOString(),
          latitude,
          longitude,
          precisao_gps: precisaoGps,
          foto_url: fotoUrl,
          projeto_id: projetoId,
          empresa_id: empresaId,
          superior_empresa_id: profileData?.superior_empresa_id,
          observacao,
          retroativo: false
        };
        OfflineService.salvarBatidaOffline(batidaOffline);
        return { success: true, offline: true };
      }

      const resultado = await BatidaService.registrarBatida({
        userId,
        tipo,
        latitude,
        longitude,
        precisaoGps,
        fotoUrl,
        projetoId,
        empresaId,
        superiorEmpresaId: profileData?.superior_empresa_id,
        observacao
      });

      if (resultado.success) {
        await carregarBatidasDoDia();
      }

      return resultado;
    } finally {
      setRegistrando(false);
    }
  }, [userId, registrando, profileData]);

  const baterEntrada = useCallback((opcoes = {}) => {
    return registrarBatida('entrada', opcoes);
  }, [registrarBatida]);

  const baterPausa = useCallback((opcoes = {}) => {
    return registrarBatida('pausa', opcoes);
  }, [registrarBatida]);

  const baterRetorno = useCallback((opcoes = {}) => {
    return registrarBatida('retorno', opcoes);
  }, [registrarBatida]);

  const baterSaida = useCallback((opcoes = {}) => {
    return registrarBatida('saida', opcoes);
  }, [registrarBatida]);

  return {
    batidas,
    estado,
    minutosTrabalhadosHoje,
    minutosPausaHoje,
    loading,
    registrando,
    profileData,
    baterEntrada,
    baterPausa,
    baterRetorno,
    baterSaida,
    recarregar: carregarBatidasDoDia
  };
}

export default useBatidaPonto;
