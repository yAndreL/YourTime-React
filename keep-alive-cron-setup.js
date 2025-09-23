// keep-alive-cron-setup.js
// Script para configurar execução automática do keep-alive no Windows

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Cria um arquivo .bat para execução automática
 */
function criarArquivoBat() {
  const batContent = `@echo off
cd /d "%~dp0"
node keep-alive.js
`

  const batPath = 'keep-alive.bat'
  fs.writeFileSync(batPath, batContent)

  console.log(`✅ Arquivo ${batPath} criado`)
  console.log(`📍 Localização: ${path.resolve(batPath)}`)
  return batPath
}

/**
 * Mostra instruções para configuração do Agendador de Tarefas do Windows
 */
function mostrarInstrucoesAgendador() {
  console.log('\n📅 Configuração do Agendador de Tarefas do Windows:')
  console.log('')
  console.log('1. Abra o Agendador de Tarefas:')
  console.log('   - Pressione Win + R')
  console.log('   - Digite: taskschd.msc')
  console.log('   - Pressione Enter')
  console.log('')
  console.log('2. Crie uma nova tarefa:')
  console.log('   - Ação > Criar Tarefa')
  console.log('   - Nome: "YourTime Keep-Alive"')
  console.log('   - Execute como: seu usuário atual')
  console.log('   - Marque: "Executar com privilégios máximos" (se necessário)')
  console.log('')
  console.log('3. Configure os gatilhos:')
  console.log('   - Novo gatilho > Diário')
  console.log('   - Iniciar: 09:00 (ou horário desejado)')
  console.log('   - Repetir a cada: 1 hora (ou intervalo desejado)')
  console.log('   - Marque: "Habilitado"')
  console.log('')
  console.log('4. Configure as ações:')
  console.log('   - Nova ação > Iniciar um programa')
  console.log(`   - Programa: ${path.resolve('keep-alive.bat')}`)
  console.log('   - Iniciar em: diretório atual')
  console.log('')
  console.log('5. Configurações adicionais:')
  console.log('   - Condições: desmarque todas (ou configure conforme necessário)')
  console.log('   - Configurações: marque "Executar tarefa o mais breve possível"')
  console.log('')
  console.log('6. Salve a tarefa')
  console.log('')
  console.log('💡 Alternativas:')
  console.log('   - Use o arquivo .bat criado para executar manualmente')
  console.log('   - Configure via PowerShell: schtasks /create /tn "YourTime-KeepAlive" /tr "cmd /c keep-alive.bat" /sc hourly')
}

/**
 * Mostra alternativas para execução automática
 */
function mostrarAlternativas() {
  console.log('\n🔧 Alternativas de execução automática:')
  console.log('')
  console.log('1. Usando PowerShell (execução única):')
  console.log('   powershell -Command "while($true) { node keep-alive.js; Start-Sleep -Seconds 3600 }"')
  console.log('')
  console.log('2. Usando Node.js com PM2 (recomendado para produção):')
  console.log('   npm install -g pm2')
  console.log('   pm2 start keep-alive.js --name "yourtime-keepalive"')
  console.log('   pm2 startup')
  console.log('   pm2 save')
  console.log('')
  console.log('3. Usando Docker (se disponível):')
  console.log('   docker run -d --name yourtime-keepalive node:18-alpine sh -c "cd /app && npm install && node keep-alive.js"')
  console.log('')
  console.log('4. Serviço do Windows (avançado):')
  console.log('   - Use NSSM (Non-Sucking Service Manager)')
  console.log('   - Download: https://nssm.cc/')
  console.log('')
}

/**
 * Testa se o script funciona
 */
function testarScript() {
  console.log('🧪 Testando script de keep-alive...')

  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync('keep-alive.js')) {
      console.error('❌ Arquivo keep-alive.js não encontrado!')
      return false
    }

    // Verificar variáveis de ambiente
    const envFile = '.env'
    if (!fs.existsSync(envFile)) {
      console.error('❌ Arquivo .env não encontrado!')
      console.log('💡 Execute: npm run keep-alive:setup')
      return false
    }

    console.log('✅ Arquivos necessários encontrados')
    console.log('✅ Configuração básica OK')
    return true

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return false
  }
}

// Função principal
function main() {
  console.log('🚀 Configuração do Keep-Alive Automático')
  console.log('========================================\n')

  // Testar script primeiro
  if (!testarScript()) {
    console.log('\n❌ Corrija os problemas acima antes de continuar')
    return
  }

  // Criar arquivo .bat
  criarArquivoBat()

  // Mostrar instruções
  mostrarInstrucoesAgendador()
  mostrarAlternativas()

  console.log('🎉 Configuração concluída!')
  console.log('\n💡 Para executar manualmente:')
  console.log('   npm run keep-alive')
  console.log('   node keep-alive.js')
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
