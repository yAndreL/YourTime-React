import { useContext } from 'react';
import { ContextoIdioma } from '../contexts/ContextoIdioma.jsx';

export function useLanguage() {
  const context = useContext(ContextoIdioma);
  if (!context) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  }
  return context;
}
