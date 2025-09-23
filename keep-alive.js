// keep-alive.js
// Script para manter o banco de dados ativo com consultas periódicas
// Evita que o Supabase entre em modo de suspensão por inatividade

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkikgvkapnyfhpwhngxw.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjYzNDcsImV4cCI6MjA3MTE0MjM0N30.8el8jBGOIgoNX5mANz9fRyCeLZZseK0kjkSvogxn-Jk'

// Configurações do script
const CONFIG = {
  // Intervalo entre consultas (em minutos)
  INTERVAL_MINUTES: process.env.KEEP_ALIVE_INTERVAL || 60, // 1 consulta por hora por padrão

  // Número máximo de consultas antes de parar (0 = infinito)
  MAX_QUERIES: process.env.MAX_KEEP_ALIVE_QUERIES || 0,

  // Arquivo de log
  LOG_FILE: process.env.KEEP_ALIVE_LOG_FILE || 'keep-alive.log',

  // Queries a serem executadas
  QUERIES: [
    // Consulta básica à tabela profiles
    async (supabase) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })

      return { table: 'profiles', count: data, error }
    },

    // Consulta à tabela agendamento (se existir)
    async (supabase) => {
      const { data, error } = await supabase
        .from('agendamento')
        .select('count', { count: 'exact', head: true })

      return { table: 'agendamento', count: data, error }
    }
  ]
}

// Estado do script
let queryCount = 0
let isRunning = false

// Função para logar mensagens
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}`

  console.log(logMessage)

  // Salvar no arquivo de log
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n')
  } catch (error) {
    console.error('Erro ao salvar log:', error.message)
  }
}

// Função para executar consultas de keep-alive
async function executarKeepAlive() {
  if (isRunning) {
    log('Consulta anterior ainda em andamento, pulando...', 'WARN')
    return
  }

  isRunning = true
  queryCount++

  log(`Executando consulta de keep-alive #${queryCount}`)

  try {
    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Executar todas as consultas configuradas
    for (let i = 0; i < CONFIG.QUERIES.length; i++) {
      const query = CONFIG.QUERIES[i]

      try {
        const resultado = await query(supabase)

        if (resultado.error) {
          log(`Erro na consulta ${i + 1} (${resultado.table}): ${resultado.error.message}`, 'ERROR')
        } else {
          log(`Consulta ${i + 1} (${resultado.table}) OK - ${resultado.count} registros`, 'SUCCESS')
        }
      } catch (error) {
        log(`Exceção na consulta ${i + 1}: ${error.message}`, 'ERROR')
      }
    }

    log(`Consulta #${queryCount} concluída com sucesso`)

  } catch (error) {
    log(`Erro geral na consulta #${queryCount}: ${error.message}`, 'ERROR')
  } finally {
    isRunning = false

    // Verificar se deve parar
    if (CONFIG.MAX_QUERIES > 0 && queryCount >= CONFIG.MAX_QUERIES) {
      log(`Número máximo de consultas (${CONFIG.MAX_QUERIES}) atingido. Parando script.`)
      clearInterval(intervalId)
      return
    }
  }
}

// Função para mostrar estatísticas
function mostrarEstatisticas() {
  const uptime = new Date().toISOString()
  const proximoEm = new Date(Date.now() + CONFIG.INTERVAL_MINUTES * 60 * 1000).toISOString()

  log(`=== ESTATÍSTICAS DO KEEP-ALIVE ===`)
  log(`Consultas executadas: ${queryCount}`)
  log(`Intervalo: ${CONFIG.INTERVAL_MINUTES} minutos`)
  log(`Última execução: ${uptime}`)
  log(`Próxima execução: ${proximoEm}`)
  log(`Log file: ${path.resolve(CONFIG.LOG_FILE)}`)
  log(`=================================`)
}

// Função principal
function iniciarKeepAlive() {
  log('Iniciando script de keep-alive do banco de dados')
  log(`Configuração: Intervalo=${CONFIG.INTERVAL_MINUTES}min, MaxQueries=${CONFIG.MAX_QUERIES || 'ilimitado'}`)

  // Mostrar estatísticas iniciais
  mostrarEstatisticas()

  // Executar primeira consulta imediatamente
  executarKeepAlive()

  // Agendar próximas consultas
  const intervalMs = CONFIG.INTERVAL_MINUTES * 60 * 1000
  const intervalId = setInterval(executarKeepAlive, intervalMs)

  // Mostrar estatísticas a cada hora
  setInterval(mostrarEstatisticas, 60 * 60 * 1000)

  // Tratamento de sinais para graceful shutdown
  process.on('SIGINT', () => {
    log('Recebido SIGINT. Parando script...')
    clearInterval(intervalId)
    log('Script parado pelo usuário')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    log('Recebido SIGTERM. Parando script...')
    clearInterval(intervalId)
    log('Script parado por sinal de término')
    process.exit(0)
  })

  log(`Script iniciado com sucesso. Executando a cada ${CONFIG.INTERVAL_MINUTES} minuto(s)`)
}

// Verificação de variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente do Supabase não configuradas!')
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
  process.exit(1)
}

// Iniciar o script
iniciarKeepAlive()

export { CONFIG, executarKeepAlive, mostrarEstatisticas }
