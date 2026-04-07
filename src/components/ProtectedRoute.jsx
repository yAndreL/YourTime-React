import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
function ProtectedRoute({
  children,
  requireAdmin = false
}) {
  const { t } = useLanguage();
  const [carregando, setCarregando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  useEffect(() => {
    let cancelado = false;
    const verificarAcesso = async () => {
      try {
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          if (!cancelado) {
            setAutorizado(false);
            setCarregando(false);
          }
          return;
        }
        const user = session.user;

        if (!requireAdmin) {
          if (!cancelado) {
            setAutorizado(true);
            setCarregando(false);
          }
          return;
        }
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (cancelado) return;
        if (error) {
          setAutorizado(false);
          setCarregando(false);
          return;
        }
        const ehAdministrador = profile?.role === 'admin';
        if (!cancelado) {
          setAutorizado(ehAdministrador);
          setCarregando(false);
        }
      } catch (error) {
        if (!cancelado) {
          setAutorizado(false);
          setCarregando(false);
        }
      }
    };
    verificarAcesso();
    return () => {
      cancelado = true;
    };
  }, [requireAdmin]);
  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('comum.carregando')}</p>
        </div>
      </div>;
  }
  if (!autorizado) {
    if (requireAdmin) {
      return <Navigate to="/acesso-negado" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
export default ProtectedRoute;
