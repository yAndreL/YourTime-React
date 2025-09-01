// AgendamentoApiController.js
// Controller da API para gerenciar agendamentos no backend

import { inserirRegistro, testarConexao } from '../services/database.js'
import { testarConexaoSupabase, inserirRegistroSupabase } from '../services/supabase-api.js'

class AgendamentoApiController {
  constructor() {
    this.usarSupabaseRest = false
  }

  /**
   * Testa a conexão com o banco de dados
   */
  async testarConexao(req, res) {
    console.log('🔍 Recebida solicitação de teste de conexão')
    console.log('[DEBUG] Headers recebidos:', req.headers)
    console.log('[DEBUG] Query params:', req.query)
    
    // Verifica se deve usar a API REST
    if (req.query.useRestApi === 'true') {
      this.usarSupabaseRest = true
      console.log('🔀 Alterando para modo API REST Supabase')
    } else if (req.query.useRestApi === 'false') {
      this.usarSupabaseRest = false
      console.log('🔀 Alterando para modo PostgreSQL direto')
    }
    
    try {
      if (this.usarSupabaseRest) {
        console.log('🌐 Testando conexão via Supabase REST API...')
        const resultado = await testarConexaoSupabase()
        console.log('📊 Resultado do teste via REST API:', resultado)
        
        if (resultado.sucesso) {
          console.log('✅ Conexão REST bem-sucedida')
          res.setHeader('Content-Type', 'application/json')
          res.status(200).json(resultado)
        } else {
          console.log('❌ Falha na conexão REST')
          res.status(500).json(resultado)
        }
      } else {
        console.log('🌐 Testando conexão direta com o banco de dados PostgreSQL...')
        const resultado = await testarConexao()
        console.log('📊 Resultado do teste de conexão PostgreSQL:', resultado)
        
        if (resultado.sucesso) {
          console.log('✅ Conexão PostgreSQL bem-sucedida')
          res.setHeader('Content-Type', 'application/json')
          res.status(200).json(resultado)
        } else {
          console.log('❌ Falha na conexão PostgreSQL. Tentando REST API...')
          
          try {
            const resultadoRest = await testarConexaoSupabase()
            if (resultadoRest.sucesso) {
              console.log('✅ Conexão via REST API bem-sucedida como fallback')
              this.usarSupabaseRest = true
              resultadoRest.mensagem = 'Conexão PostgreSQL falhou, mas API REST funcionou! Modo REST ativado.'
              resultadoRest.postgresError = resultado.mensagem
              res.setHeader('Content-Type', 'application/json')
              res.status(200).json(resultadoRest)
            } else {
              console.log('❌ Ambos os métodos falharam')
              res.status(500).json({
                ...resultado,
                restApiTambemFalhou: true,
                mensagem: `PostgreSQL: ${resultado.mensagem}. REST API: ${resultadoRest.mensagem}`
              })
            }
          } catch (restError) {
            console.error('💥 Erro durante o teste de conexão REST:', restError)
            res.status(500).json(resultado)
          }
        }
      }
    } catch (error) {
      console.error('💥 Erro durante o teste de conexão:', error)
      res.status(500).json({
        sucesso: false,
        mensagem: `Erro interno: ${error.message}`
      })
    }
  }

  /**
   * Insere um novo registro de agendamento
   */
  async inserirAgendamento(req, res) {
    console.log('📝 Recebida solicitação para inserir registro')
    console.log('[DEBUG] Headers recebidos:', req.headers)
    console.log('[DEBUG] Body raw:', req.body)
    
    try {
      const dados = req.body
      console.log('📦 Dados recebidos:', dados)
      
      // Validação básica
      if (!dados.dia || !dados.hora_entrada || !dados.hora_saida || !dados.pausa) {
        console.log('⚠️ Dados incompletos')
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Dados incompletos. Por favor, preencha todos os campos obrigatórios.'
        })
      }
      
      if (this.usarSupabaseRest) {
        console.log('💾 Tentando inserir registro via REST API...')
        const resultado = await inserirRegistroSupabase(dados)
        console.log('📊 Resultado da inserção REST API:', resultado)
        
        if (resultado.sucesso) {
          console.log('✅ Registro inserido com sucesso via REST API')
          res.setHeader('Content-Type', 'application/json')
          res.status(201).json(resultado)
        } else {
          console.log('❌ Falha ao inserir registro via REST API')
          res.status(500).json(resultado)
        }
      } else {
        console.log('💾 Tentando inserir registro no banco de dados PostgreSQL...')
        const resultado = await inserirRegistro(dados)
        console.log('📊 Resultado da inserção PostgreSQL:', resultado)
        
        if (resultado.sucesso) {
          console.log('✅ Registro inserido com sucesso via PostgreSQL')
          res.setHeader('Content-Type', 'application/json')
          res.status(201).json(resultado)
        } else {
          console.log('❌ Falha ao inserir registro via PostgreSQL. Tentando REST API...')
          
          try {
            const resultadoRest = await inserirRegistroSupabase(dados)
            if (resultadoRest.sucesso) {
              console.log('✅ Inserção via REST API bem-sucedida como fallback')
              this.usarSupabaseRest = true
              resultadoRest.mensagem = 'Inserção PostgreSQL falhou, mas API REST funcionou! Modo REST ativado.'
              resultadoRest.postgresError = resultado.mensagem
              res.setHeader('Content-Type', 'application/json')
              res.status(201).json(resultadoRest)
            } else {
              console.log('❌ Ambos os métodos de inserção falharam')
              res.status(500).json({
                ...resultado,
                restApiTambemFalhou: true,
                mensagem: `PostgreSQL: ${resultado.mensagem}. REST API: ${resultadoRest.mensagem}`
              })
            }
          } catch (restError) {
            console.error('💥 Erro durante a inserção via REST API:', restError)
            res.status(500).json(resultado)
          }
        }
      }
    } catch (error) {
      console.error('💥 Erro durante a inserção do registro:', error)
      res.status(500).json({
        sucesso: false,
        mensagem: `Erro interno: ${error.message}`
      })
    }
  }

  /**
   * Diagnóstico do sistema
   */
  async diagnostico(req, res) {
    console.log('🔍 Recebida solicitação de diagnóstico na rota /api/diagnostico')
    console.log('[DEBUG] Query params:', req.query)
    
    const action = req.query.action
    
    if (action === 'check-server') {
      try {
        const info = {
          serverInfo: {
            timestamp: new Date().toISOString(),
            node: process.version,
            platform: process.platform,
            hostname: require('os').hostname()
          },
          conexaoInfo: {
            host: 'db.gkikgvkapnyfhpwhngxw.supabase.co',
            port: 5432,
            database: 'postgres',
            user: 'postgres',
            useSSL: true
          }
        }
        
        try {
          const resultadoConexao = await testarConexao()
          info.conexaoTeste = resultadoConexao
        } catch (error) {
          info.conexaoTeste = { sucesso: false, erro: error.message }
        }
        
        try {
          const { lookup } = require('dns')
          const { promisify } = require('util')
          const lookupAsync = promisify(lookup)
          
          const dnsResult = await lookupAsync('db.gkikgvkapnyfhpwhngxw.supabase.co')
          info.dnsLookup = {
            sucesso: true,
            address: dnsResult.address,
            family: dnsResult.family
          }
        } catch (error) {
          info.dnsLookup = {
            sucesso: false,
            erro: error.message
          }
        }
        
        const safeInfo = JSON.parse(JSON.stringify(info))
        res.setHeader('Content-Type', 'application/json')
        res.status(200).json(safeInfo)
      } catch (error) {
        res.status(500).json({
          sucesso: false,
          mensagem: `Erro no diagnóstico: ${error.message}`
        })
      }
    } else {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Ação de diagnóstico não especificada ou inválida'
      })
    }
  }
}

export default AgendamentoApiController
