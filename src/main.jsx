import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App_clean from './App_clean_new.jsx'
import Login from './views/Login.jsx'
import CadastroUser from './components/forms/CadastroUser_simple.jsx'
import EsqueciSenha from './views/EsqueciSenha.jsx'
import ResetarSenha from './views/ResetarSenha.jsx'
import PainelAdmin from './views/PainelAdmin.jsx'
import FormularioPonto from './components/forms/FormularioPonto.jsx'
import HistoricoApontamento from './views/HistoricoApontamento.jsx'
import GerenciamentoProjetos from './views/GerenciamentoProjetos.jsx'
import Perfil from './views/Perfil.jsx'
import Configuracoes from './views/Configuracoes.jsx'
import DatabaseSetupView from './views/DatabaseSetupView.jsx'
import AcessoNegado from './views/AcessoNegado.jsx'
import Notificacoes from './views/Notificacoes.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import { NotificationProvider } from './providers/NotificationProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <NotificationProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/resetar-senha" element={<ResetarSenha />} />
          
          {/* Rotas protegidas - requerem autenticação */}
          <Route path="/" element={<ProtectedRoute><App_clean /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><App_clean /></ProtectedRoute>} />
          <Route path="/formulario-ponto" element={<ProtectedRoute><FormularioPonto /></ProtectedRoute>} />
          <Route path="/historico" element={<ProtectedRoute><HistoricoApontamento /></ProtectedRoute>} />
          <Route path="/projeto" element={<ProtectedRoute><GerenciamentoProjetos /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/perfil/:userId" element={<ProtectedRoute requireAdmin={true}><Perfil /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          <Route path="/notificacoes" element={<ProtectedRoute><Notificacoes /></ProtectedRoute>} />
          <Route path="/database-setup" element={<ProtectedRoute><DatabaseSetupView /></ProtectedRoute>} />
          
          {/* Rotas admin - requerem role admin */}
          <Route path="/cadastro" element={<ProtectedRoute requireAdmin={true}><CadastroUser /></ProtectedRoute>} />
          <Route path="/painel-admin" element={<ProtectedRoute requireAdmin={true}><PainelAdmin /></ProtectedRoute>} />
          
          {/* Rota de acesso negado */}
          <Route path="/acesso-negado" element={<AcessoNegado />} />
        </Routes>
      </Router>
      </NotificationProvider>
    </ToastProvider>
  </StrictMode>,
)
