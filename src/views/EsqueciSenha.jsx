import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLoader, FiArrowLeft, FiKey } from 'react-icons/fi';
import { postAuthRecovery } from '../services/ApiService';
import { useLanguage } from '../hooks/useLanguage.jsx';
import { salvarRecuperacaoEmail } from '../utils/passwordRecoveryStorage';

function EsqueciSenha() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [carregandoEnvio, setCarregandoEnvio] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');

  const processarEnvioCodigoRecuperacaoSeisDigitos = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoEnvio(true);
    setMensagemErro('');
    try {
      const emailFormatado = emailRecuperacao.trim().toLowerCase();
      await postAuthRecovery(emailFormatado);
      salvarRecuperacaoEmail(emailFormatado);
      navigate('/verificar-codigo', { state: { email: emailFormatado } });
    } catch (erroEnvio) {
      setMensagemErro(erroEnvio.message || t('validacao.errorSendingEmail'));
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
              Informe seu e-mail e receba um c&oacute;digo de 6 d&iacute;gitos para verificar sua identidade.
            </p>
          </div>

          <form onSubmit={processarEnvioCodigoRecuperacaoSeisDigitos} className="space-y-6">
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
              {mensagemErro && <p className="mt-2 text-sm text-red-600">{mensagemErro}</p>}
            </div>

            <button
              type="submit"
              disabled={carregandoEnvio}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {carregandoEnvio ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Enviando&hellip;
                </>
              ) : (
                <>
                  <FiKey className="w-5 h-5" />
                  Enviar c&oacute;digo de verifica&ccedil;&atilde;o
                </>
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
