import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { getTranslation } from '../i18n/translations';
import { ContextoIdioma } from '../contexts/ContextoIdioma.jsx';

export function LanguageProvider({ children }) {
  const [idiomaAtual, setIdiomaAtual] = useState('pt-BR');
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    carregarIdiomaUsuario();
  }, []);
  const carregarIdiomaUsuario = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setCarregando(false);
      const user = session?.user;
      if (!user) return;
      const { data, error: erroConfig } = await supabase
        .from('configuracoes')
        .select('language')
        .eq('user_id', user.id)
        .maybeSingle();
      if (erroConfig && import.meta.env.DEV) {
        console.warn('[ProvedorIdioma] configuracoes:', erroConfig.message);
      }
      if (data?.language) {
        setIdiomaAtual(data.language);
      }
    } catch (error) {
      setCarregando(false);
    }
  };
  const alterarIdioma = async novoIdioma => {
    setIdiomaAtual(novoIdioma);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from('configuracoes').update({
          language: novoIdioma
        }).eq('user_id', user.id);
      }
    } catch (error) {}
  };
  const t = key => getTranslation(idiomaAtual, key);
  return (
    <ContextoIdioma.Provider
      value={{
        currentLanguage: idiomaAtual,
        alterarIdioma,
        t,
        carregando
      }}
    >
      {children}
    </ContextoIdioma.Provider>
  );
}
