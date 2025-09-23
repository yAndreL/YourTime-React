// keep-alive-config.js
// Script auxiliar para configurar e executar o keep-alive

import { config } from 'dotenv'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

// Carregar variáveis de ambiente
config()

// Configurações padrão
const DEFAULT_CONFIG = {
  KEEP_ALIVE_INTERVAL: 60,     // 60 minutos = 1 consulta por hora
  MAX_KEEP_ALIVE_QUERIES: 0,   // 0 = ilimitado
  KEEP_ALIVE_LOG_FILE: 'keep-alive.log'
}

/**
 * Cria ou atualiza arquivo .env com configurações do keep-alive
 */
function configurarAmbiente() {
  console.log('🔧 Configurando ambiente para keep-alive...')

  let envContent = ''
  let envExists = false

  try {
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8')
      envExists = true
    }
  } catch (error) {
    console.log('Arquivo .env não encontrado, criando novo...')
  }

  // Adicionar configurações do keep-alive se não existirem
  const lines = envContent.split('\n')
  const keepAliveConfigs = [
    `KEEP_ALIVE_INTERVAL=${DEFAULT_CONFIG.KEEP_ALIVE_INTERVAL}`,
    `MAX_KEEP_ALIVE_QUERIES=${DEFAULT_CONFIG.MAX_KEEP_ALIVE_QUERIES}`,
    `KEEP_ALIVE_LOG_FILE=${DEFAULT_CONFIG.KEEP_ALIVE_LOG_FILE}`
  ]

  let updated = false
  keepAliveConfigs.forEach(config => {
    const [key] = config.split('=')
    const exists = lines.some(line => line.startsWith(`${key}=`))

    if (!exists) {
      lines.push(config)
      updated = true
    }
  })

  if (updated || !envExists) {
    const newContent = lines.filter(line => line.trim()).join('\n')
    fs.writeFileSync('.env', newContent + '\n')
    console.log('✅ Configurações do keep-alive adicionadas ao .env')
  } else {
    console.log('✅ Configurações já existem no .env')
  }
}

/**
 * Mostra configurações atuais
 */
function mostrarConfiguracoes() {
  console.log('\n📋 Configurações do Keep-Alive:')
  console.log(`Intervalo: ${process.env.KEEP_ALIVE_INTERVAL || DEFAULT_CONFIG.KEEP_ALIVE_INTERVAL} minutos`)
  console.log(`Máximo de consultas: ${process.env.MAX_KEEP_ALIVE_QUERIES || DEFAULT_CONFIG.MAX_KEEP_ALIVE_QUERIES || 'ilimitado'}`)
  console.log(`Arquivo de log: ${process.env.KEEP_ALIVE_LOG_FILE || DEFAULT_CONFIG.KEEP_ALIVE_LOG_FILE}`)
  console.log(`Supabase URL: ${process.env.VITE_SUPABASE_URL ? 'Configurada' : 'Não configurada'}`)
  console.log(`Supabase Key: ${process.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada'}`)
}

/**
 * Executa o script de keep-alive
 */
function executarKeepAlive() {
  console.log('🚀 Iniciando script de keep-alive...')

  const child = spawn('node', ['keep-alive.js'], {
    stdio: 'inherit',
    detached: false
  })

  child.on('error', (error) => {
    console.error('❌ Erro ao executar keep-alive:', error.message)
    process.exit(1)
  })

  child.on('exit', (code) => {
    console.log(`🔄 Processo keep-alive terminou com código: ${code}`)
  })

  // Permite encerrar o processo pai sem afetar o filho
  process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando...')
    child.kill('SIGTERM')
    process.exit(0)
  })
}

/**
 * Mostra instruções de uso
 */
function mostrarInstrucoes() {
  console.log('\n📖 Como usar o script de keep-alive:')
  console.log('')
  console.log('1. Configuração automática:')
  console.log('   node keep-alive-config.js setup')
  console.log('')
  console.log('2. Ver configurações:')
  console.log('   node keep-alive-config.js config')
  console.log('')
  console.log('3. Executar keep-alive:')
  console.log('   node keep-alive-config.js run')
  console.log('')
  console.log('4. Ou execute diretamente:')
  console.log('   node keep-alive.js')
  console.log('')
  console.log('💡 Dica: Configure no .env para personalizar:')
  console.log('   KEEP_ALIVE_INTERVAL=30    # Consulta a cada 30 minutos')
  console.log('   MAX_KEEP_ALIVE_QUERIES=100 # Para automaticamente após 100 consultas')
  console.log('')
}

// Verificar argumentos da linha de comando
const comando = process.argv[2]

switch (comando) {
  case 'setup':
    configurarAmbiente()
    mostrarConfiguracoes()
    break

  case 'config':
    mostrarConfiguracoes()
    break

  case 'run':
    executarKeepAlive()
    break

  default:
    mostrarInstrucoes()
    break
}
