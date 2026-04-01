import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { FiLock, FiLoader, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import { limparRecuperacao, lerRecuperacaoVerificada } from '../utils/passwordRecoveryStorage';

function interpretarRespostaRpcRedefinicaoSenha(dadosResposta) {
  if (dadosResposta == null) return { sucesso: false, mensagem: null };
  if (typeof dadosResposta === 'object' && !Array.isArray(dadosResposta) && 'success' in dadosResposta) {
    return { sucesso: Boolean(dadosResposta.success), mensagem: dadosResposta.message || null };
  }
  if (typeof dadosResposta === 'string') {
    try {
      const objetoJson = JSON.parse(dadosResposta);
      return { sucesso: Boolean(objetoJson.success), mensagem: objetoJson.message || null };
    } catch {
      return { sucesso: false, mensagem: null };
    }
  }
  return { sucesso: true, mensagem: null };
}

function urlHashIndicaFluxoRecuperacaoSenha() {
  const fragmentoHash = typeof window !== 'undefined' ? window.location.hash : '';
  return fragmentoHash.includes('type=recovery') || fragmentoHash.includes('type%3Drecovery');
}

function ResetarSenha() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [etapaRedefinicaoSenha, setEtapaRedefinicaoSenha] = useState('checando');
  const [emailFluxoCodigoVerificado, setEmailFluxoCodigoVerificado] = useState('');
  const [novaSenhaDigitada, setNovaSenhaDigitada] = useState('');
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState('');
  const [carregandoAtualizacaoSenha, setCarregandoAtualizacaoSenha] = useState(false);
  const [mensagemErroFormulario, setMensagemErroFormulario] = useState('');
  const [redefinicaoConcluidaComSucesso, setRedefinicaoConcluidaComSucesso] = useState(false);

  const navegarParaEsqueciSenha = useCallback(() => {
    navigate('/esqueci-senha', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let componenteDesmontado = false;

    const tentarAtivarFluxoLegadoCodigoVerificado = () => {
      const estadoNavegacao = location.state;
      const dadosArmazenados = lerRecuperacaoVerificada();
      const emailResolvido =
        (estadoNavegacao?.email && String(estadoNavegacao.email).trim().toLowerCase()) ||
        (dadosArmazenados?.email ? String(dadosArmazenados.email).trim().toLowerCase() : '');
      const codigoFoiVerificado = Boolean(estadoNavegacao?.codigoVerificado) || Boolean(dadosArmazenados);
      if (emailResolvido && codigoFoiVerificado) {
        setEmailFluxoCodigoVerificado(emailResolvido);
        setEtapaRedefinicaoSenha('legado');
        return true;
      }
      return false;
    };

    if (tentarAtivarFluxoLegadoCodigoVerificado()) {
      return () => {
        componenteDesmontado = true;
      };
    }

    const { data: inscricaoAuth } = supabase.auth.onAuthStateChange((eventoAuth, sessao) => {
      if (componenteDesmontado) return;
      if (eventoAuth === 'PASSWORD_RECOVERY' && sessao) {
        setEtapaRedefinicaoSenha('sessao_link_email');
      }
    });

    const sessaoAtualEhRecuperacaoPorLink = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const fragmentoHash = typeof window !== 'undefined' ? window.location.hash : '';
      if (urlHashIndicaFluxoRecuperacaoSenha()) return true;
      if (fragmentoHash.includes('access_token') && fragmentoHash.includes('type=recovery')) return true;
      if (fragmentoHash.includes('access_token') && fragmentoHash.includes('type%3Drecovery')) return true;
      return false;
    };

    (async () => {
      for (const milissegundosEspera of [0, 400, 1200, 2500, 5000]) {
        if (milissegundosEspera) await new Promise(resolver => setTimeout(resolver, milissegundosEspera));
        if (componenteDesmontado) return;
        if (await sessaoAtualEhRecuperacaoPorLink()) {
          if (!componenteDesmontado) setEtapaRedefinicaoSenha('sessao_link_email');
          return;
        }
      }
    })();

    const temporizadorFluxoInvalido = setTimeout(() => {
      if (componenteDesmontado) return;
      setEtapaRedefinicaoSenha(etapaAtual => (etapaAtual !== 'checando' ? etapaAtual : 'invalido'));
    }, 9000);

    return () => {
      componenteDesmontado = true;
      clearTimeout(temporizadorFluxoInvalido);
      inscricaoAuth.subscription.unsubscribe();
    };
  }, [location.state]);

  useEffect(() => {
    if (etapaRedefinicaoSenha !== 'invalido') return;
    const temporizadorRedirecionamento = setTimeout(() => navegarParaEsqueciSenha(), 2000);
    return () => clearTimeout(temporizadorRedirecionamento);
  }, [etapaRedefinicaoSenha, navegarParaEsqueciSenha]);

  const processarDefinicaoNovaSenha = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoAtualizacaoSenha(true);
    setMensagemErroFormulario('');
    if (novaSenhaDigitada.length < 6) {
      setMensagemErroFormulario(t('validacao.passwordMinLengthReset'));
      setCarregandoAtualizacaoSenha(false);
      return;
    }
    if (novaSenhaDigitada !== confirmacaoNovaSenha) {
      setMensagemErroFormulario(t('validacao.passwordsNotMatchReset'));
      setCarregandoAtualizacaoSenha(false);
      return;
    }

    try {
      if (etapaRedefinicaoSenha === 'sessao_link_email') {
        const { error: erroAtualizacao } = await supabase.auth.updateUser({ password: novaSenhaDigitada });
        if (erroAtualizacao) {
          setMensagemErroFormulario(erroAtualizacao.message || t('validacao.errorUpdatingPassword'));
          setCarregandoAtualizacaoSenha(false);
          return;
        }
        limparRecuperacao();
        await supabase.auth.signOut();
        setRedefinicaoConcluidaComSucesso(true);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
        return;
      }

      if (etapaRedefinicaoSenha === 'legado') {
        const { data: dadosRpc, error: erroRpc } = await supabase.rpc('reset_user_password', {
          user_email: emailFluxoCodigoVerificado,
          new_password: novaSenhaDigitada
        });
        if (erroRpc) {
          if (erroRpc.message.includes('function') && erroRpc.message.includes('does not exist')) {
            setMensagemErroFormulario(t('validacao.pendingDatabaseConfig'));
          } else {
            setMensagemErroFormulario(erroRpc.message || t('validacao.errorUpdatingPassword'));
          }
          setCarregandoAtualizacaoSenha(false);
          return;
        }
        const resultadoInterpretado = interpretarRespostaRpcRedefinicaoSenha(dadosRpc);
        if (!resultadoInterpretado.sucesso) {
          setMensagemErroFormulario(resultadoInterpretado.mensagem || t('validacao.errorUpdatingPassword'));
          setCarregandoAtualizacaoSenha(false);
          return;
        }
        limparRecuperacao();
        setRedefinicaoConcluidaComSucesso(true);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
        return;
      }
    } catch {
      setMensagemErroFormulario('Ocorreu um erro inesperado. Tente novamente.');
    }
    setCarregandoAtualizacaoSenha(false);
  };

  if (etapaRedefinicaoSenha === 'checando') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <FiLoader className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('comum.loading')}</p>
        </div>
      </div>
    );
  }

  if (etapaRedefinicaoSenha === 'invalido') {
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

  if (redefinicaoConcluidaComSucesso) {
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
              {etapaRedefinicaoSenha === 'sessao_link_email'
                ? 'Defina sua nova senha para a conta.'
                : `Conta: ${emailFluxoCodigoVerificado}`}
            </p>
          </div>

          <form onSubmit={processarDefinicaoNovaSenha} className="space-y-6">
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
                  value={novaSenhaDigitada}
                  onChange={evento => {
                    setNovaSenhaDigitada(evento.target.value);
                    setMensagemErroFormulario('');
                  }}
                  disabled={carregandoAtualizacaoSenha}
                  className={
                    'w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed' +
                    (mensagemErroFormulario ? ' !border-red-500' : '')
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
                  value={confirmacaoNovaSenha}
                  onChange={evento => {
                    setConfirmacaoNovaSenha(evento.target.value);
                    setMensagemErroFormulario('');
                  }}
                  disabled={carregandoAtualizacaoSenha}
                  className={
                    'w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed' +
                    (mensagemErroFormulario ? ' !border-red-500' : '')
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              {mensagemErroFormulario && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">{mensagemErroFormulario}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={carregandoAtualizacaoSenha}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {carregandoAtualizacaoSenha ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('comum.loading')}
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
