import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { FiLock, FiLoader, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { limparRecuperacao, lerRecuperacaoVerificada } from '../utils/passwordRecoveryStorage';

function parseRpcResult(data) {
  if (data == null) return { success: false, message: null };
  if (typeof data === 'object' && !Array.isArray(data) && 'success' in data) {
    return { success: Boolean(data.success), message: data.message || null };
  }
  if (typeof data === 'string') {
    try {
      const o = JSON.parse(data);
      return { success: Boolean(o.success), message: o.message || null };
    } catch {
      return { success: false, message: null };
    }
  }
  return { success: true, message: null };
}

function hashIndicaRecuperacao() {
  const h = typeof window !== 'undefined' ? window.location.hash : '';
  return h.includes('type=recovery') || h.includes('type%3Drecovery');
}

function ResetarSenha() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [modo, setModo] = useState('checando');
  const [emailLegacy, setEmailLegacy] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const irParaEsqueci = useCallback(() => {
    navigate('/esqueci-senha', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelado = false;

    const tentarLegacy = () => {
      const state = location.state;
      const armazenado = lerRecuperacaoVerificada();
      const email =
        (state?.email && String(state.email).trim().toLowerCase()) ||
        (armazenado?.email ? String(armazenado.email).trim().toLowerCase() : '');
      const verificado = Boolean(state?.codigoVerificado) || Boolean(armazenado);
      if (email && verificado) {
        setEmailLegacy(email);
        setModo('legacy');
        return true;
      }
      return false;
    };

    if (tentarLegacy()) {
      return () => {
        cancelado = true;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelado) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setModo('supabase');
      }
    });

    const sessaoEhRecuperacao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hashIndicaRecuperacao()) return true;
      if (hash.includes('access_token') && hash.includes('type=recovery')) return true;
      if (hash.includes('access_token') && hash.includes('type%3Drecovery')) return true;
      return false;
    };

    (async () => {
      for (const espera of [0, 400, 1200, 2500, 5000]) {
        if (espera) await new Promise(r => setTimeout(r, espera));
        if (cancelado) return;
        if (await sessaoEhRecuperacao()) {
          if (!cancelado) setModo('supabase');
          return;
        }
      }
    })();

    const tInvalido = setTimeout(() => {
      if (cancelado) return;
      setModo(current => (current !== 'checando' ? current : 'invalido'));
    }, 9000);

    return () => {
      cancelado = true;
      clearTimeout(tInvalido);
      sub.subscription.unsubscribe();
    };
  }, [location.state]);

  useEffect(() => {
    if (modo !== 'invalido') return;
    const t = setTimeout(() => irParaEsqueci(), 2000);
    return () => clearTimeout(t);
  }, [modo, irParaEsqueci]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    if (novaSenha.length < 6) {
      setErro(t('validation.passwordMinLengthReset'));
      setLoading(false);
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro(t('validation.passwordsNotMatchReset'));
      setLoading(false);
      return;
    }

    try {
      if (modo === 'supabase') {
        const { error: upErr } = await supabase.auth.updateUser({ password: novaSenha });
        if (upErr) {
          setErro(upErr.message || t('validation.errorUpdatingPassword'));
          setLoading(false);
          return;
        }
        limparRecuperacao();
        await supabase.auth.signOut();
        setSucesso(true);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
        return;
      }

      if (modo === 'legacy') {
        const { data, error: rpcError } = await supabase.rpc('reset_user_password', {
          user_email: emailLegacy,
          new_password: novaSenha
        });
        if (rpcError) {
          if (rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
            setErro(t('validation.pendingDatabaseConfig'));
          } else {
            setErro(rpcError.message || t('validation.errorUpdatingPassword'));
          }
          setLoading(false);
          return;
        }
        const parsed = parseRpcResult(data);
        if (!parsed.success) {
          setErro(parsed.message || t('validation.errorUpdatingPassword'));
          setLoading(false);
          return;
        }
        limparRecuperacao();
        setSucesso(true);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
        return;
      }
    } catch {
      setErro('Ocorreu um erro inesperado. Tente novamente.');
    }
    setLoading(false);
  };

  if (modo === 'checando') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <FiLoader className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (modo === 'invalido') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center yt-modal-surface rounded-xl shadow-2xl p-8">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Link inválido ou sessão expirada. Redirecionando…</p>
          <Link to="/esqueci-senha" className="text-blue-600 dark:text-blue-400 text-sm font-medium">
            Solicitar nova recuperação
          </Link>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="yt-modal-surface rounded-xl shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Senha alterada!</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Sua senha foi atualizada com sucesso</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center">Redirecionando para o login…</p>
            </div>
            <div className="flex justify-center">
              <FiLoader className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="yt-modal-surface rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Nova senha</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {modo === 'supabase'
                ? 'Defina sua nova senha para a conta.'
                : `Conta: ${emailLegacy}`}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="novaSenha" className="block text-sm font-semibold yt-label mb-2">
                Nova senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="novaSenha"
                  value={novaSenha}
                  onChange={e => {
                    setNovaSenha(e.target.value);
                    setErro('');
                  }}
                  disabled={loading}
                  className={
                    'w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed' +
                    (erro ? ' !border-red-500' : '')
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmarSenha" className="block text-sm font-semibold yt-label mb-2">
                Confirmar nova senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  id="confirmarSenha"
                  value={confirmarSenha}
                  onChange={e => {
                    setConfirmarSenha(e.target.value);
                    setErro('');
                  }}
                  disabled={loading}
                  className={
                    'w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed' +
                    (erro ? ' !border-red-500' : '')
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {erro && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">{erro}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                'Confirmar nova senha'
              )}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              <FiArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetarSenha;
