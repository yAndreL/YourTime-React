import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLoader, FiArrowLeft, FiKey } from 'react-icons/fi';
import { supabase } from '../config/supabase';
import { enviarCodigoRecuperacao } from '../services/EmailService';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { salvarRecuperacaoCodigo } from '../utils/passwordRecoveryStorage';

function EsqueciSenha() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [carregandoEnvio, setCarregandoEnvio] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [metodoRecuperacao, setMetodoRecuperacao] = useState('link');
  const [linkRecuperacaoEnviado, setLinkRecuperacaoEnviado] = useState(false);

  const gerarCodigoNumericoSeisDigitos = () => Math.floor(100000 + Math.random() * 900000).toString();

  const processarEnvioLinkRecuperacaoPorEmail = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoEnvio(true);
    setMensagemErro('');
    setLinkRecuperacaoEnviado(false);
    const emailFormatado = emailRecuperacao.trim().toLowerCase();
    try {
      const urlRedirecionamentoReset = `${window.location.origin}/resetar-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailFormatado, { redirectTo: urlRedirecionamentoReset });
      if (error) {
        setMensagemErro(error.message || t('validacao.errorSendingEmail'));
        return;
      }
      setLinkRecuperacaoEnviado(true);
    } catch (erro) {
      console.error(erro);
      setMensagemErro(t('validacao.errorSendingEmail'));
    } finally {
      setCarregandoEnvio(false);
    }
  };

  const processarEnvioCodigoRecuperacaoSeisDigitos = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoEnvio(true);
    setMensagemErro('');
    try {
      const emailFormatado = emailRecuperacao.trim().toLowerCase();
      const codigoGerado = gerarCodigoNumericoSeisDigitos();
      await enviarCodigoRecuperacao(emailFormatado, codigoGerado);
      salvarRecuperacaoCodigo(emailFormatado, codigoGerado);
      if (import.meta.env.DEV) {
        console.info('[YourTime] Código de recuperação (ambiente local):', codigoGerado);
      }
      navigate('/verificar-codigo', {
        state: {
          email: emailFormatado,
          codigo: codigoGerado
        }
      });
    } catch (erroEnvio) {
      console.error('Erro ao enviar email:', erroEnvio);
      setMensagemErro(t('validacao.errorSendingEmail'));
    } finally {
      setCarregandoEnvio(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="yt-modal-surface rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Recuperar senha</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Informe seu e-mail e escolha como deseja recuperar o acesso.
            </p>
          </div>

          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 mb-6 gap-1">
            <button
              type="button"
              onClick={() => {
                setMetodoRecuperacao('link');
                setMensagemErro('');
                setLinkRecuperacaoEnviado(false);
              }}
              className={`flex-1 py-2 px-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                metodoRecuperacao === 'link'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Link por e-mail
            </button>
            <button
              type="button"
              onClick={() => {
                setMetodoRecuperacao('codigo');
                setMensagemErro('');
                setLinkRecuperacaoEnviado(false);
              }}
              className={`flex-1 py-2 px-2 text-xs sm:text-sm font-medium rounded-md transition-colors inline-flex items-center justify-center gap-1 ${
                metodoRecuperacao === 'codigo'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FiKey className="w-3.5 h-3.5 shrink-0" />
              Código 6 dígitos
            </button>
          </div>

          {linkRecuperacaoEnviado && metodoRecuperacao === 'link' && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-gray-700 dark:text-gray-300">
              Se existir uma conta para este e-mail, você receberá um link da <strong>Supabase</strong> para
              definir uma nova senha. Verifique também a pasta de spam. O link abre esta aplicação em{' '}
              <strong>/resetar-senha</strong>.
            </div>
          )}

          <form onSubmit={metodoRecuperacao === 'link' ? processarEnvioLinkRecuperacaoPorEmail : processarEnvioCodigoRecuperacaoSeisDigitos} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold yt-label mb-2">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={emailRecuperacao}
                  onChange={evento => {
                    setEmailRecuperacao(evento.target.value);
                    setMensagemErro('');
                  }}
                  disabled={carregandoEnvio}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent yt-field disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed ${mensagemErro ? '!border-red-500' : ''}`}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {metodoRecuperacao === 'codigo' && import.meta.env.DEV && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  Modo desenvolvimento: o e-mail não é enviado; o código aparece no console (F12) e na próxima tela o fluxo segue normalmente.
                </p>
              )}
              {mensagemErro && <p className="mt-2 text-sm text-red-600 flex items-center gap-1">{mensagemErro}</p>}
            </div>

            <button
              type="submit"
              disabled={carregandoEnvio}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {carregandoEnvio ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Enviando…
                </>
              ) : metodoRecuperacao === 'link' ? (
                'Enviar link de recuperação'
              ) : (
                'Enviar código'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors text-sm font-medium inline-flex items-center gap-2"
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

export default EsqueciSenha;
