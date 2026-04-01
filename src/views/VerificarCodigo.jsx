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

  const dadosIniciaisVerificacao = useMemo(() => {
    const estadoNavegacao = location.state;
    let emailExtraido = estadoNavegacao?.email ? String(estadoNavegacao.email).trim().toLowerCase() : '';
    let codigoExtraido = estadoNavegacao?.codigo != null ? String(estadoNavegacao.codigo) : '';
    if (!emailExtraido || !codigoExtraido) {
      const pendenteArmazenado = lerRecuperacaoPendente();
      if (pendenteArmazenado) {
        emailExtraido = emailExtraido || pendenteArmazenado.email;
        codigoExtraido = codigoExtraido || pendenteArmazenado.code;
      }
    }
    return { email: emailExtraido, codigo: codigoExtraido };
  }, [location.state]);

  const [emailAtual, setEmailAtual] = useState(dadosIniciaisVerificacao.email);
  const [codigoEsperadoServidor, setCodigoEsperadoServidor] = useState(dadosIniciaisVerificacao.codigo);
  const [digitosCodigo, setDigitosCodigo] = useState(['', '', '', '', '', '']);
  const [carregandoVerificacao, setCarregandoVerificacao] = useState(false);
  const [mensagemErroValidacao, setMensagemErroValidacao] = useState('');
  const [exibirOpcaoReenvio, setExibirOpcaoReenvio] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [mensagemSucessoReenvio, setMensagemSucessoReenvio] = useState('');
  const refsInputDigitosCodigo = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    setEmailAtual(dadosIniciaisVerificacao.email);
    setCodigoEsperadoServidor(dadosIniciaisVerificacao.codigo);
  }, [dadosIniciaisVerificacao.email, dadosIniciaisVerificacao.codigo]);

  useEffect(() => {
    if (!emailAtual || !codigoEsperadoServidor) {
      navigate('/esqueci-senha', { replace: true });
      return;
    }
    salvarRecuperacaoCodigo(emailAtual, codigoEsperadoServidor);
    const temporizadorReenvio = setTimeout(() => setExibirOpcaoReenvio(true), 20000);
    return () => clearTimeout(temporizadorReenvio);
  }, [emailAtual, codigoEsperadoServidor, navigate]);

  const atualizarDigitoCodigoVerificacao = (indiceDigito, valorDigitado) => {
    if (!/^\d*$/.test(valorDigitado)) return;
    const novosDigitos = [...digitosCodigo];
    novosDigitos[indiceDigito] = valorDigitado.slice(-1);
    setDigitosCodigo(novosDigitos);
    setMensagemErroValidacao('');
    if (valorDigitado && indiceDigito < 5) {
      refsInputDigitosCodigo[indiceDigito + 1].current?.focus();
    }
  };

  const aoTeclaPressionadaNoCampoCodigo = (indiceDigito, eventoTecla) => {
    if (eventoTecla.key === 'Backspace' && !digitosCodigo[indiceDigito] && indiceDigito > 0) {
      refsInputDigitosCodigo[indiceDigito - 1].current?.focus();
    }
  };

  const aoColarCodigoDeSeisDigitos = eventoColagem => {
    eventoColagem.preventDefault();
    const textoColado = eventoColagem.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (textoColado.length === 6) {
      setDigitosCodigo(textoColado.split(''));
      refsInputDigitosCodigo[5].current?.focus();
      setMensagemErroValidacao('');
    }
  };

  const processarConfirmacaoCodigoVerificacao = async eventoEnvio => {
    eventoEnvio.preventDefault();
    setCarregandoVerificacao(true);
    setMensagemErroValidacao('');
    const codigoDigitadoCompleto = digitosCodigo.join('');
    const codigoEsperadoNormalizado = String(codigoEsperadoServidor).trim();
    if (codigoDigitadoCompleto.length !== 6) {
      setMensagemErroValidacao(t('validacao.fillAllDigits'));
      setCarregandoVerificacao(false);
      return;
    }
    if (codigoDigitadoCompleto === codigoEsperadoNormalizado) {
      marcarCodigoVerificado(emailAtual);
      navigate('/resetar-senha', {
        state: {
          email: emailAtual,
          codigoVerificado: true
        }
      });
    } else {
      setMensagemErroValidacao(t('validacao.invalidCode'));
      setDigitosCodigo(['', '', '', '', '', '']);
      refsInputDigitosCodigo[0].current?.focus();
    }
    setCarregandoVerificacao(false);
  };

  const processarReenvioCodigoRecuperacao = async () => {
    setReenviandoCodigo(true);
    setMensagemSucessoReenvio('');
    setMensagemErroValidacao('');
    try {
      const novoCodigoGerado = Math.floor(100000 + Math.random() * 900000).toString();
      await enviarCodigoRecuperacao(emailAtual, novoCodigoGerado);
      salvarRecuperacaoCodigo(emailAtual, novoCodigoGerado);
      if (import.meta.env.DEV) {
        console.info('[YourTime] Novo código de recuperação (dev):', novoCodigoGerado);
      }
      setCodigoEsperadoServidor(novoCodigoGerado);
      setDigitosCodigo(['', '', '', '', '', '']);
      navigate('/verificar-codigo', {
        state: {
          email: emailAtual,
          codigo: novoCodigoGerado
        },
        replace: true
      });
      setMensagemSucessoReenvio('Novo código enviado com sucesso!');
      setExibirOpcaoReenvio(false);
      setTimeout(() => {
        setExibirOpcaoReenvio(true);
        setMensagemSucessoReenvio('');
      }, 20000);
    } catch {
      setMensagemErroValidacao(t('validacao.errorResendingCode'));
    } finally {
      setReenviandoCodigo(false);
    }
  };

  if (!emailAtual || !codigoEsperadoServidor) {
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

          <form onSubmit={processarConfirmacaoCodigoVerificacao} className="space-y-6">
            <div>
              <div className="flex justify-center gap-2 mb-4" onPaste={aoColarCodigoDeSeisDigitos}>
                {digitosCodigo.map((digito, indice) => (
                  <input
                    key={indice}
                    ref={refsInputDigitosCodigo[indice]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digito}
                    onChange={evento => atualizarDigitoCodigoVerificacao(indice, evento.target.value)}
                    onKeyDown={evento => aoTeclaPressionadaNoCampoCodigo(indice, evento)}
                    disabled={carregandoVerificacao}
                    className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed ${mensagemErroValidacao ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    autoFocus={indice === 0}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {mensagemErroValidacao && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-1">
                  <FiAlertCircle className="w-4 h-4 shrink-0" /> {mensagemErroValidacao}
                </p>
              )}

              {mensagemSucessoReenvio && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
                  <FiMail className="w-4 h-4 shrink-0" /> {mensagemSucessoReenvio}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={carregandoVerificacao || digitosCodigo.some(d => !d)}
              className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              {carregandoVerificacao ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('comum.loading')}
                </>
              ) : (
                'Verificar código'
              )}
            </button>
          </form>

          {exibirOpcaoReenvio && (
            <div className="mt-6 text-center">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Não recebeu o código? Confira a caixa de spam ou{' '}
                  <button
                    type="button"
                    onClick={processarReenvioCodigoRecuperacao}
                    disabled={reenviandoCodigo}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                  >
                    {reenviandoCodigo ? (
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
