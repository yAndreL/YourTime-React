import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useLanguage } from '../../hooks/useLanguage.jsx';
import { FiHome, FiFileText, FiCalendar, FiTarget, FiSettings, FiUserCheck, FiUser, FiX, FiLogOut, FiClock, FiAlertTriangle, FiClipboard, FiUserMinus, FiLink } from 'react-icons/fi';
function Sidebar({
  menuLateralAberto,
  setMenuLateralAberto
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    t
  } = useLanguage();
  const obterPapelEmCache = () => {
    const cached = sessionStorage.getItem('userRole');
    return cached === 'admin';
  };
  const [ehAdministrador, setEhAdministrador] = useState(obterPapelEmCache());
  useEffect(() => {
    const verificarPapelAdmin = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          setEhAdministrador(false);
          sessionStorage.removeItem('userRole');
          return;
        }
        const {
          data: profile,
          error
        } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (error) {
          setEhAdministrador(false);
          sessionStorage.removeItem('userRole');
          return;
        }
        const statusAdmin = profile?.role === 'admin';
        if (statusAdmin) {
          sessionStorage.setItem('userRole', 'admin');
        } else {
          sessionStorage.setItem('userRole', 'user');
        }
        if (ehAdministrador !== statusAdmin) {
          setEhAdministrador(statusAdmin);
        }
      } catch (error) {
        setEhAdministrador(false);
        sessionStorage.removeItem('userRole');
      }
    };
    verificarPapelAdmin();
  }, []);
  const estaAtiva = path => {
    return location.pathname === path;
  };
  const itensMenu = [{
    path: '/',
    icon: FiHome,
    label: t('menuPrincipal.dashboard')
  }, {
    path: '/batida-ponto',
    icon: FiClock,
    label: t('menuPrincipal.timeRecord')
  }, {
    path: '/painel-admin',
    icon: FiUserCheck,
    label: t('menuPrincipal.adminPanel'),
    adminOnly: true
  }, {
    path: '/irregularidades',
    icon: FiAlertTriangle,
    label: t('menuPrincipal.irregularidades'),
    adminOnly: true
  }, {
    path: '/historico',
    icon: FiCalendar,
    label: t('menuPrincipal.history')
  }, {
    path: '/espelho-ponto',
    icon: FiClipboard,
    label: t('menuPrincipal.espelhoPonto')
  }, {
    path: '/batidas-sem-projeto',
    icon: FiLink,
    label: t('menuPrincipal.batidasSemProjeto')
  }, {
    path: '/ausencias',
    icon: FiUserMinus,
    label: t('menuPrincipal.ausencias')
  }, {
    path: '/projeto',
    icon: FiTarget,
    label: t('menuPrincipal.projects')
  }];
  const itensConfiguracoes = [{
    path: '/perfil',
    icon: FiUser,
    label: t('menuPrincipal.profile')
  }, {
    path: '/configuracoes',
    icon: FiSettings,
    label: t('menuPrincipal.settings')
  }];
  const aoSolicitarLogoutUsuario = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      if ('caches' in window) {
        const nomesCache = await caches.keys();
        await Promise.all(nomesCache.map(name => caches.delete(name)));
      }
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      navigate('/login');
    }
  };
  return <>
      <div className={`${menuLateralAberto ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform lg:translate-x-0 lg:fixed flex flex-col border-r border-gray-200 dark:border-gray-800`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">YourTime</h1>
          <button type="button" onClick={() => setMenuLateralAberto(false)} className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto mt-6 px-6 pb-6">
          <div className="space-y-2">
            {itensMenu.map(item => {
            if (item.adminOnly && !ehAdministrador) return null;
            const Icon = item.icon;
            const active = estaAtiva(item.path);
            return <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active ? 'text-white bg-blue-600 dark:bg-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <Icon className="mr-3 w-5 h-5" /> {item.label}
                </Link>;
          })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-3">
              {t('menuPrincipal.personal')}
            </div>
            <div className="space-y-2">
              {itensConfiguracoes.map(item => {
              const Icon = item.icon;
              const active = estaAtiva(item.path);
              return <Link key={item.path} to={item.path} className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${active ? 'text-white bg-blue-600 dark:bg-blue-600 shadow-sm' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                    <Icon className="mr-3 w-5 h-5" /> {item.label}
                  </Link>;
            })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={aoSolicitarLogoutUsuario} className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors">
              <FiLogOut className="mr-3 w-5 h-5" /> {t('menuPrincipal.logout')}
            </button>
          </div>
        </nav>
      </div>

      {menuLateralAberto && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setMenuLateralAberto(false)}></div>}
    </>;
}
export default Sidebar;
