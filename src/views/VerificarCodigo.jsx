import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiLoader, FiMail, FiAlertCircle } from 'react-icons/fi';
import { enviarCodigoRecuperacao } from '../services/EmailService';
import { useLanguage } from '../hooks/useLanguage';
import {
  salvarRecuperacaoCodigo,
  lerRecuperacaoPendente,
  marcarCodigoVerificado
} from '../utils/passwordRecoveryStorage';

function VerificarCodigo() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const inicial = useMemo(() => {
    const state = location.state;
    let email = state?.email ? String(state.email).trim().toLowerCase() : '';
    let codigo = state?.codigo != null ? String(state.codigo) : '';
    if (!email || !codigo) {
      const pendente = lerRecuperacaoPendente();
      if (pendente) {
        email = email || pendente.email;
        codigo = codigo || pendente.code;
      }
    }
    return { email, codigo };
  }, [location.state]);

  const [emailAtual, setEmailAtual] = useState(inicial.email);
  const [codigoEsperado, setCodigoEsperado] = useState(inicial.codigo);
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarReenvio, setMostrarReenvio] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    setEmailAtual(inicial.email);
    setCodigoEsperado(inicial.codigo);
  }, [inicial.email, inicial.codigo]);

  useEffect(() => {
    if (!emailAtual || !codigoEsperado) {
      navigate('/esqueci-senha', { replace: true });
      return;
    }
    salvarRecuperacaoCodigo(emailAtual, codigoEsperado);
    const timer = setTimeout(() => setMostrarReenvio(true), 20000);
    return () => clearTimeout(timer);
  }, [emailAtual, codigoEsperado, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCodigo = [...codigo];
    newCodigo[index] = value.slice(-1);
    setCodigo(newCodigo);
    setErro('');
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = e => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setCodigo(pastedData.split(''));
      inputRefs[5].current?.focus();
      setErro('');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    const codigoDigitado = codigo.join('');
    const esperado = String(codigoEsperado).trim();
    if (codigoDigitado.length !== 6) {
      setErro(t('validation.fillAllDigits'));
      setLoading(false);
      return;
    }
    if (codigoDigitado === esperado) {
      marcarCodigoVerificado(emailAtual);
      navigate('/resetar-senha', {
        state: {
          email: emailAtual,
          codigoVerificado: true
        }
      });
    } else {
      setErro(t('validation.invalidCode'));
      setCodigo(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
    }
    setLoading(false);
  };

  const handleReenviarCodigo = async () => {
    setReenviando(true);
    setMensagemSucesso('');
    setErro('');
    try {
      const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
      await enviarCodigoRecuperacao(emailAtual, novoCodigo);
      salvarRecuperacaoCodigo(emailAtual, novoCodigo);
      if (import.meta.env.DEV) {
        console.info('[YourTime] Novo código de recuperação (dev):', novoCodigo);
      }
      setCodigoEsperado(novoCodigo);
      setCodigo(['', '', '', '', '', '']);
      navigate('/verificar-codigo', {
        state: {
          email: emailAtual,
          codigo: novoCodigo
        },
        replace: true
      });
      setMensagemSucesso('Novo código enviado com sucesso!');
      setMostrarReenvio(false);
      setTimeout(() => {
        setMostrarReenvio(true);
        setMensagemSucesso('');
      }, 20000);
    } catch {
      setErro(t('validation.errorResendingCode'));
    } finally {
      setReenviando(false);
    }
  };

  if (!emailAtual || !codigoEsperado) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="yt-modal-surface rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Verificar código</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Digite o código de 6 dígitos enviado para
            </p>
            <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm mt-1 break-all">{emailAtual}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
                {codigo.map((digit, index) => (
                  <input
                    key={index}
                    ref={inputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    disabled={loading}
                    className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed ${erro ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    autoFocus={index === 0}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {erro && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-4 h-4 shrink-0" /> {erro}
                </p>
              )}

              {mensagemSucesso && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
                  <FiMail className="w-4 h-4 shrink-0" /> {mensagemSucesso}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || codigo.some(d => !d)}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                'Verificar código'
              )}
            </button>
          </form>

          {mostrarReenvio && (
            <div className="mt-6 text-center">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Não recebeu o código? Confira a caixa de spam ou{' '}
                  <button
                    type="button"
                    onClick={handleReenviarCodigo}
                    disabled={reenviando}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {reenviando ? (
                      <>
                        <FiLoader className="w-3 h-3 animate-spin" />
                        reenviando…
                      </>
                    ) : (
                      'reenviar o código'
                    )}
                  </button>
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
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

export default VerificarCodigo;
