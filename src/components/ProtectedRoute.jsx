import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
function ProtectedRoute({
  children,
  requireAdmin = false
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  useEffect(() => {
    let cancelado = false;
    const checkAccess = async () => {
      try {
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          if (!cancelado) {
            setIsAuthorized(false);
            setLoading(false);
          }
          return;
        }
        const user = session.user;

        if (!requireAdmin) {
          if (!cancelado) {
            setIsAuthorized(true);
            setLoading(false);
          }
          void supabase.auth.getUser();
          return;
        }
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (cancelado) return;
        if (error) {
          setIsAuthorized(false);
          setLoading(false);
          return;
        }
        const isAdmin = profile?.role === 'admin';
        if (!cancelado) {
          setIsAuthorized(isAdmin);
          setLoading(false);
        }
        if (isAdmin) {
          void supabase.auth.getUser();
        }
      } catch (error) {
        if (!cancelado) {
          setIsAuthorized(false);
          setLoading(false);
        }
      }
    };
    checkAccess();
    return () => {
      cancelado = true;
    };
  }, [requireAdmin]);
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>;
  }
  if (!isAuthorized) {
    if (requireAdmin) {
      return <Navigate to="/acesso-negado" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
export default ProtectedRoute;
