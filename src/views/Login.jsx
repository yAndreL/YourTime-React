import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import { supabase } from '../config/supabase';
import { FiMail, FiLock, FiLoader } from 'react-icons/fi';
import logoYourTime from '../assets/yourtimelogo.png';
function Login() {
  const {
    t
  } = useLanguage();
  const {
    showError
  } = useToast();
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [carregandoAutenticacao, setCarregandoAutenticacao] = useState(false);
  const navigate = useNavigate();
  const processarAutenticacao = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoAutenticacao(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: emailLogin,
        password: senhaLogin
      });
      if (error) {
        const mensagemErro = error.message || '';
        const credenciaisInvalidas = /invalid login credentials|invalid email or password|wrong password|email not confirmed/i.test(mensagemErro);
        showError(credenciaisInvalidas ? t('autenticacao.invalidCredentials') : mensagemErro || t('autenticacao.loginError'));
        setCarregandoAutenticacao(false);
        return;
      }
      if (data?.user) {
        const {
          data: perfilUsuario,
          error: erroPerfil
        } = await supabase.from('profiles').select('role, is_active').eq('id', data.user.id).single();
        if (erroPerfil) {
          showError(t('autenticacao.errorLoadingProfile'));
          await supabase.auth.signOut();
          setCarregandoAutenticacao(false);
          return;
        }
        if (perfilUsuario && perfilUsuario.is_active === false) {
          showError(t('autenticacao.accountDeactivated'));
          await supabase.auth.signOut();
          setCarregandoAutenticacao(false);
          navigate('/acesso-negado');
          return;
        }
        if (perfilUsuario) {
          sessionStorage.setItem('userRole', perfilUsuario.role || 'usuario');
        }
        navigate('/');
      }
    } catch (erroDesconhecido) {
      showError(t('autenticacao.loginError'));
      setCarregandoAutenticacao(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <img src={logoYourTime} alt="YourTime Logo" className="h-40 sm:h-60 w-auto" />
            </div>
          </div>
          
          <form onSubmit={processarAutenticacao} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {t('autenticacao.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input type="email" id="email" name="email" value={emailLogin} onChange={evento => setEmailLogin(evento.target.value)} disabled={carregandoAutenticacao} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" placeholder={t('autenticacao.emailPlaceholder')} required />
              </div>
            </div>

            <div>
              <label htmlFor="senha" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {t('autenticacao.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input type="password" id="senha" name="senha" value={senhaLogin} onChange={evento => setSenhaLogin(evento.target.value)} disabled={carregandoAutenticacao} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed" placeholder={t('autenticacao.passwordPlaceholder')} required />
              </div>
            </div>

            <button type="submit" disabled={carregandoAutenticacao} className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2">
              {carregandoAutenticacao ? <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('comum.loading')}...
                </> : t('autenticacao.loginButton')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/esqueci-senha" className="block text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium">
              {t('autenticacao.forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>;
}
export default Login;
