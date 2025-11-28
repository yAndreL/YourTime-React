import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { getTranslation } from '../i18n/translations'

// Criar contexto de idioma
const LanguageContext = createContext()

// Provider do idioma
export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState('pt-BR')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserLanguage()
  }, [])

  const loadUserLanguage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('configuracoes')
          .select('language')
          .eq('user_id', user.id)
          .single()
        
        if (data && data.language) {
          setCurrentLanguage(data.language)
        }
      }
    } catch (error) {
      // Erro silencioso
    } finally {
      setIsLoading(false)
    }
  }

  const changeLanguage = async (newLanguage) => {
    setCurrentLanguage(newLanguage)
    
    // Salvar no banco
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('configuracoes')
          .update({ language: newLanguage })
          .eq('user_id', user.id)
      }
    } catch (error) {
      // Erro silencioso
    }
  }

  const t = (key) => getTranslation(currentLanguage, key)

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook para usar o idioma
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider')
  }
  return context
}
