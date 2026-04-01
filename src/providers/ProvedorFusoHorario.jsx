import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import ConfigService from '../services/ConfigService';
import { ContextoFusoHorario } from '../contexts/ContextoFusoHorario.jsx';
import { FUSO_PADRAO_IANA, obterFusoHorarioNavegadorOuPadrao } from '../utils/fusoHorarioData';

export function ProvedorFusoHorario({ children }) {
  const [fusoHorario, setFusoHorario] = useState(FUSO_PADRAO_IANA);
  const [carregandoFuso, setCarregandoFuso] = useState(true);

  const carregarFusoParaUsuario = useCallback(async userId => {
    if (!userId) {
      setFusoHorario(obterFusoHorarioNavegadorOuPadrao());
      setCarregandoFuso(false);
      return;
    }
    try {
      const resultado = await ConfigService.buscarConfiguracoes(userId);
      const tz = resultado.success && resultado.data?.fuso_horario
        ? resultado.data.fuso_horario
        : FUSO_PADRAO_IANA;
      setFusoHorario(tz || FUSO_PADRAO_IANA);
    } catch {
      setFusoHorario(FUSO_PADRAO_IANA);
    } finally {
      setCarregandoFuso(false);
    }
  }, []);

  const recarregarFusoHorario = useCallback(async () => {
    setCarregandoFuso(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();
    await carregarFusoParaUsuario(session?.user?.id ?? null);
  }, [carregarFusoParaUsuario]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (cancelado) return;
      await carregarFusoParaUsuario(session?.user?.id ?? null);
    })();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      void carregarFusoParaUsuario(sessao?.user?.id ?? null);
    });
    return () => {
      cancelado = true;
      subscription.unsubscribe();
    };
  }, [carregarFusoParaUsuario]);

  return (
    <ContextoFusoHorario.Provider
      value={{
        fusoHorario,
        carregandoFuso,
        recarregarFusoHorario
      }}
    >
      {children}
    </ContextoFusoHorario.Provider>
  );
}
