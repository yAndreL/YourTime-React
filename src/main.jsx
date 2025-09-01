import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App_clean from './App_clean_new.jsx'
import Login from './views/Login.jsx'
import CadastroUser from './components/forms/CadastroUser_simple.jsx'
import EsqueciSenha from './components/forms/EsqueciSenha.jsx'
import PainelAdmin from './views/PainelAdmin.jsx'
import FormularioPonto from './components/forms/FormularioPonto.jsx'
import HistoricoApontamento from './views/HistoricoApontamento.jsx'
import GerenciamentoProjetos from './views/GerenciamentoProjetos.jsx'
import Perfil from './views/Perfil.jsx'
import Configuracoes from './views/Configuracoes.jsx'
import VerificaConexaoDB from './services/VerificaConexaoDB.jsx'
import DatabaseSetupView from './views/DatabaseSetupView.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App_clean />} />
        <Route path="/home" element={<App_clean />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroUser />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/painel-admin" element={<PainelAdmin />} />
        <Route path="/formulario-ponto" element={<FormularioPonto />} />
        <Route path="/historico" element={<HistoricoApontamento />} />
        <Route path="/projeto" element={<GerenciamentoProjetos />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/verificar-conexao" element={<VerificaConexaoDB />} />
        <Route path="/database-setup" element={<DatabaseSetupView />} />
      </Routes>
    </Router>
  </StrictMode>,
)
