import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import App_clean from './App_clean_new.jsx'
import Login from './components/Login.jsx'
import CadastroUser from './components/CadastroUser_simple.jsx'
import EsqueciSenha from './components/EsqueciSenha.jsx'
import Registrar from './components/Registrar.jsx'
import FormularioPonto from './components/FormularioPonto.jsx'
import HistoricoApontamento from './components/HistoricoApontamento.jsx'
import TelaNaoFinalizada from './components/TelaNaoFinalizada.jsx'
import Perfil from './components/Perfil.jsx'
import Configuracoes from './components/Configuracoes.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App_clean />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroUser />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/registrar" element={<Registrar />} />
        <Route path="/formulario-ponto" element={<FormularioPonto />} />
        <Route path="/historico" element={<HistoricoApontamento />} />
        <Route path="/projeto" element={<TelaNaoFinalizada />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Router>
  </StrictMode>,
)
