// export-database.js
// Script para exportar dados do banco de dados Supabase

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkikgvkapnyfhpwhngxw.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjYzNDcsImV4cCI6MjA3MTE0MjM0N30.8el8jBGOIgoNX5mANz9fRyCeLZZseK0kjkSvogxn-Jk'

async function exportDatabaseData() {
  console.log('🔄 Iniciando exportação de dados do banco...')
  console.log('📍 URL do Supabase:', supabaseUrl)

  try {
    // Criar cliente Supabase
    console.log('🔗 Conectando ao Supabase...')
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('✅ Cliente Supabase criado')

    const exportData = {
      timestamp: new Date().toISOString(),
      tables: {}
    }

    // Tabelas para exportar (baseado no seu projeto)
    const tables = [
      'profiles',
      'agendamento',
      'agendamento_historico',
      'jornadas',
      'banco_horas',
      'empresas',
      'projetos',
      'feriados'
      // 'users' // tabela padrão do Supabase Auth - pode não ter dados úteis para export
    ]

    for (const table of tables) {
      try {
        console.log(`📊 Exportando tabela: ${table}`)

        // Buscar todos os dados da tabela
        console.log(`🔍 Consultando tabela ${table}...`)
        const { data, error } = await supabase
          .from(table)
          .select('*')

        if (error) {
          console.log(`⚠️ Erro ao exportar ${table}:`, error.message)
          exportData.tables[table] = {
            error: error.message,
            count: 0,
            data: []
          }
        } else {
          console.log(`✅ ${table}: ${data?.length || 0} registros`)
          exportData.tables[table] = {
            count: data?.length || 0,
            data: data || []
          }
        }
      } catch (err) {
        console.error(`❌ Erro ao processar tabela ${table}:`, err.message)
        exportData.tables[table] = {
          error: err.message,
          count: 0,
          data: []
        }
      }
    }

    // Salvar arquivo JSON
    const filename = `database-export-${new Date().toISOString().split('T')[0]}.json`
    console.log(`💾 Salvando arquivo: ${filename}`)
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2))
    console.log(`✅ Arquivo salvo com sucesso!`)

    console.log(`\n🎉 Exportação concluída!`)
    console.log(`📁 Arquivo salvo: ${filename}`)
    console.log(`📊 Total de tabelas processadas: ${tables.length}`)

    // Mostrar resumo
    Object.entries(exportData.tables).forEach(([table, info]) => {
      const status = info.error ? '❌' : '✅'
      console.log(`${status} ${table}: ${info.count} registros`)
    })

    return exportData

  } catch (error) {
    console.error('❌ Erro geral na exportação:', error)
    throw error
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  exportDatabaseData()
    .then(() => {
      console.log('\n✅ Processo concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Processo falhou:', error.message)
      process.exit(1)
    })
}

export { exportDatabaseData }
