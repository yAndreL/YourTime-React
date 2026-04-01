import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import BatidaService from '../services/BatidaService';
import OfflineService from '../services/OfflineService';
import { salvarUltimoProjetoBatidaMinimoNoArmazenamento } from '../utils/batidaProjetoArmazenamento';
import { useFusoHorario } from './useFusoHorario.jsx';

export function useBatidaPonto() {
  const { fusoHorario } = useFusoHorario();
  const [batidas, setBatidas] = useState([]);
  const [jornadaDoDia, setJornadaDoDia] = useState({ estado: 'nao_iniciada', proximaBatida: 'entrada' });
  const [minutosTrabalhadosHoje, setMinutosTrabalhadosHoje] = useState(0);
  const [minutosPausaHoje, setMinutosPausaHoje] = useState(0);
  const [carregandoBatidas, setCarregandoBatidas] = useState(true);
  const [enviandoRegistroBatida, setEnviandoRegistroBatida] = useState(false);
  const [idUsuarioLogado, setIdUsuarioLogado] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const referenciaTimer = useRef(null);

  useEffect(() => {
    carregarDadosIniciais();
    return () => {
      if (referenciaTimer.current) clearInterval(referenciaTimer.current);
    };
  }, []);

  useEffect(() => {
    if (idUsuarioLogado) {
      carregarBatidasDoDia(idUsuarioLogado);
    }
  }, [fusoHorario, idUsuarioLogado]);

  useEffect(() => {
    if (jornadaDoDia.estado === 'trabalhando' || jornadaDoDia.estado === 'em_pausa') {
      referenciaTimer.current = setInterval(() => {
        if (batidas.length > 0) {
          setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(batidas));
          setMinutosPausaHoje(BatidaService.calcularTempoPausa(batidas));
        }
      }, 1000);
    } else {
      if (referenciaTimer.current) clearInterval(referenciaTimer.current);
    }
    return () => {
      if (referenciaTimer.current) clearInterval(referenciaTimer.current);
    };
  }, [jornadaDoDia.estado, batidas]);

  const carregarDadosIniciais = async () => {
    try {
      setCarregandoBatidas(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      setIdUsuarioLogado(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, email, superior_empresa_id, carga_horaria')
        .eq('id', user.id)
        .single();

      setPerfilUsuario(profile);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setCarregandoBatidas(false);
    }
  };

  const carregarBatidasDoDia = async (uid = null) => {
    const id = uid || idUsuarioLogado;
    if (!id) return;

    const resultado = await BatidaService.buscarBatidasDoDia(id, null, fusoHorario);
    if (resultado.success) {
      setBatidas(resultado.data);
      const estadoAtual = BatidaService.determinarEstadoJornada(resultado.data);
      setJornadaDoDia(estadoAtual);
      setMinutosTrabalhadosHoje(BatidaService.calcularTempoTrabalhado(resultado.data));
      setMinutosPausaHoje(BatidaService.calcularTempoPausa(resultado.data));
    }
  };

  const registrarBatida = useCallback(async (tipo, { latitude, longitude, precisaoGps, fotoUrl = null, observacao } = {}) => {
    if (!idUsuarioLogado || enviandoRegistroBatida) return { success: false, error: 'Operação indisponível' };

    setEnviandoRegistroBatida(true);
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
          user_id: idUsuarioLogado,
          tipo,
          timestamp_servidor: new Date().toISOString(),
          timestamp_cliente: new Date().toISOString(),
          latitude,
          longitude,
          precisao_gps: precisaoGps,
          foto_url: fotoUrl,
          projeto_id: projetoId,
          empresa_id: empresaId,
          superior_empresa_id: perfilUsuario?.superior_empresa_id,
          observacao,
          retroativo: false
        };
        OfflineService.salvarBatidaOffline(batidaOffline);
        if (projetoId) {
          let nomeProjeto = '';
          try {
            const p = JSON.parse(projetoSalvo || '{}');
            nomeProjeto = p.nome || '';
          } catch (e) {}
          salvarUltimoProjetoBatidaMinimoNoArmazenamento({
            id: projetoId,
            nome: nomeProjeto,
            empresa_id: empresaId
          });
        }
        return { success: true, offline: true };
      }

      const resultado = await BatidaService.registrarBatida({
        userId: idUsuarioLogado,
        tipo,
        latitude,
        longitude,
        precisaoGps,
        fotoUrl,
        projetoId,
        empresaId,
        superiorEmpresaId: perfilUsuario?.superior_empresa_id,
        observacao
      });

      if (resultado.success) {
        if (projetoId) {
          let nomeProjeto = '';
          try {
            const p = JSON.parse(projetoSalvo || '{}');
            nomeProjeto = p.nome || '';
          } catch (e) {}
          salvarUltimoProjetoBatidaMinimoNoArmazenamento({
            id: projetoId,
            nome: nomeProjeto,
            empresa_id: empresaId
          });
        }
        await carregarBatidasDoDia();
      }

      return resultado;
    } finally {
      setEnviandoRegistroBatida(false);
    }
  }, [idUsuarioLogado, enviandoRegistroBatida, perfilUsuario]);

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
    jornadaDoDia,
    minutosTrabalhadosHoje,
    minutosPausaHoje,
    carregandoBatidas,
    enviandoRegistroBatida,
    perfilUsuario,
    baterEntrada,
    baterPausa,
    baterRetorno,
    baterSaida,
    recarregarBatidasDoDia: carregarBatidasDoDia
  };
}

export default useBatidaPonto;
