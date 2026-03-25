import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { getTranslation } from '../i18n/translations';
const LanguageContext = createContext();
export function LanguageProvider({
  children
}) {
  const [currentLanguage, setCurrentLanguage] = useState('pt-BR');
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadUserLanguage();
  }, []);
  const loadUserLanguage = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setIsLoading(false);
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase.from('configuracoes').select('language').eq('user_id', user.id).single();
      if (data?.language) {
        setCurrentLanguage(data.language);
      }
    } catch (error) {
      setIsLoading(false);
    }
  };
  const changeLanguage = async newLanguage => {
    setCurrentLanguage(newLanguage);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        await supabase.from('configuracoes').update({
          language: newLanguage
        }).eq('user_id', user.id);
      }
    } catch (error) {}
  };
  const t = key => getTranslation(currentLanguage, key);
  return <LanguageContext.Provider value={{
    currentLanguage,
    changeLanguage,
    t,
    isLoading
  }}>
      {children}
    </LanguageContext.Provider>;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  }
  return context;
}
