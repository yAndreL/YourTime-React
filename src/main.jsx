import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { NotificationProvider } from './providers/NotificationProvider.jsx';
import { LanguageProvider } from './hooks/useLanguage.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import { useLanguage } from './hooks/useLanguage.jsx';

const App_clean = lazy(() => import('./App_clean_new.jsx'));
const Login = lazy(() => import('./views/Login.jsx'));
const CadastroUser = lazy(() => import('./components/forms/CadastroUser_simple.jsx'));
const EsqueciSenha = lazy(() => import('./views/EsqueciSenha.jsx'));
const VerificarCodigo = lazy(() => import('./views/VerificarCodigo.jsx'));
const ResetarSenha = lazy(() => import('./views/ResetarSenha.jsx'));
const PainelAdmin = lazy(() => import('./views/PainelAdmin.jsx'));
const FormularioPonto = lazy(() => import('./components/forms/FormularioPonto.jsx'));
const HistoricoApontamento = lazy(() => import('./views/HistoricoApontamento.jsx'));
const GerenciamentoProjetos = lazy(() => import('./views/GerenciamentoProjetos.jsx'));
const Perfil = lazy(() => import('./views/Perfil.jsx'));
const Configuracoes = lazy(() => import('./views/Configuracoes.jsx'));
const AcessoNegado = lazy(() => import('./views/AcessoNegado.jsx'));
const Notificacoes = lazy(() => import('./views/Notificacoes.jsx'));

if (typeof window !== 'undefined') {
  const path = window.location.pathname;
  if (path === '/' || path === '/home') {
    void import('./App_clean_new.jsx');
  }
}

const LoadingFallback = () => {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')).render(<StrictMode>
    <ThemeProvider>
    <LanguageProvider>
      <ToastProvider>
        <NotificationProvider>
          <Router>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/verificar-codigo" element={<VerificarCodigo />} />
          <Route path="/resetar-senha" element={<ResetarSenha />} />

          <Route path="/" element={<ProtectedRoute><App_clean /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><App_clean /></ProtectedRoute>} />
          <Route path="/formulario-ponto" element={<ProtectedRoute><FormularioPonto /></ProtectedRoute>} />
          <Route path="/historico" element={<ProtectedRoute><HistoricoApontamento /></ProtectedRoute>} />
          <Route path="/projeto" element={<ProtectedRoute><GerenciamentoProjetos /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/perfil/:userId" element={<ProtectedRoute requireAdmin={true}><Perfil /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />

          <Route path="/cadastro" element={<ProtectedRoute requireAdmin={true}><CadastroUser /></ProtectedRoute>} />
          <Route path="/painel-admin" element={<ProtectedRoute requireAdmin={true}><PainelAdmin /></ProtectedRoute>} />

          <Route path="/acesso-negado" element={<AcessoNegado />} />
        </Routes>
        </Suspense>
      </Router>
        </NotificationProvider>
      </ToastProvider>
    </LanguageProvider>
    </ThemeProvider>
  </StrictMode>);
