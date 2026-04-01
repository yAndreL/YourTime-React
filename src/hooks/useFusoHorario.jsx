import { useContext } from 'react';
import { ContextoFusoHorario } from '../contexts/ContextoFusoHorario.jsx';

export function useFusoHorario() {
  const contexto = useContext(ContextoFusoHorario);
  if (!contexto) {
    throw new Error('useFusoHorario deve ser usado dentro de um ProvedorFusoHorario');
  }
  return contexto;
}
