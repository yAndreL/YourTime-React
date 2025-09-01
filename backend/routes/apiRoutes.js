// apiRoutes.js
// Rotas da API organizadas com controllers

import express from 'express'
import AgendamentoApiController from '../controllers/AgendamentoApiController.js'

const router = express.Router()
const agendamentoController = new AgendamentoApiController()

// Rota para verificar a conexão
router.get('/teste-conexao', (req, res) => {
  agendamentoController.testarConexao(req, res)
})

// Rota para inserir um registro
router.post('/verificar-conexao', (req, res) => {
  agendamentoController.inserirAgendamento(req, res)
})

// Rota para diagnóstico de conexão
router.get('/diagnostico', (req, res) => {
  agendamentoController.diagnostico(req, res)
})

export default router
