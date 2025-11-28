// DatabaseSetupView.jsx
// Página para configuração e teste do banco de dados

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import supabaseService from '../services/SupabaseService.js'
import DatabaseSetup from '../utils/databaseSetup.js'
import { useLanguage } from '../hooks/useLanguage'
import { FiCheckCircle, FiXCircle, FiSettings } from 'react-icons/fi'

function DatabaseSetupView() {
  const { t } = useLanguage()
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [databaseStatus, setDatabaseStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [setupResults, setSetupResults] = useState(null)
  const [rlsFixResults, setRlsFixResults] = useState(null)

  useEffect(() => {
    checkDatabaseStructure()
  }, [])

  const checkDatabaseStructure = async () => {
    try {
      const result = await DatabaseSetup.checkDatabaseSetup()
      setDatabaseStatus(result)
    } catch (error) {
      setDatabaseStatus({
        success: false,
        error: error.message
      })
    }
  }

  const setupDatabase = async () => {
    setIsLoading(true)
    try {
      const result = await DatabaseSetup.createEssentialTables()
      setSetupResults(result)
      
      // Recarregar status após setup
      await checkDatabaseStructure()
    } catch (error) {
      setSetupResults({
        success: false,
        error: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fixRLSPerformance = async () => {
    setIsLoading(true)
    try {
      const result = await supabaseService.fixRLSPerformance()
      setRlsFixResults(result)
    } catch (error) {
      setRlsFixResults({
        success: false,
        error: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  const StatusCard = ({ title, status, details }) => (
    <div className={`p-6 rounded-lg border-2 ${
      status?.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
    }`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <span className={`mr-2 ${status?.success ? 'text-green-600' : 'text-red-600'}`}>
          {status?.success ? (
            <FiCheckCircle className="w-6 h-6" />
          ) : (
            <FiXCircle className="w-6 h-6" />
          )}
        </span>
        {title}
      </h3>
      
      <p className={`mb-3 ${status?.success ? 'text-green-700' : 'text-red-700'}`}>
        {status?.message || t('common.loading')}
      </p>
      
      {details && (
        <div className="text-sm text-gray-600">
          {typeof details === 'object' ? (
            <pre className="bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <p>{details}</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🔧 Configuração do Banco de Dados
              </h1>
              <p className="text-gray-600 mt-1">
                Teste a conexão e configure a estrutura do banco Supabase
              </p>
            </div>
            <Link 
              to="/" 
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Voltar
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <StatusCard 
            title="Conexão com Supabase"
            status={connectionStatus}
            details={connectionStatus?.error || connectionStatus?.details}
          />
          
          <StatusCard 
            title="Estrutura do Banco"
            status={databaseStatus}
            details={databaseStatus?.tables}
          />
        </div>

        {/* Auth Required Alert */}
        {connectionStatus?.needsAuth && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔐</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Autenticação Necessária
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    As tabelas requerem autenticação para serem verificadas. Isso é normal se o banco já foi configurado com RLS (Row Level Security).
                  </p>
                  <p className="mt-2">
                    <strong>Para configurar o banco:</strong>
                  </p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Acesse o <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">painel do Supabase</a></li>
                    <li>Vá em <strong>SQL Editor</strong></li>
                    <li>Copie o conteúdo do arquivo <code className="bg-yellow-100 px-1 rounded">database/schema_supabase.sql</code></li>
                    <li>Execute o SQL para criar as tabelas</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup Section */}
        {connectionStatus?.success && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FiSettings className="w-6 h-6" /> Configuração
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-blue-900">Estrutura do Banco</h3>
                  <p className="text-sm text-blue-700">
                    {databaseStatus?.isSetup 
                      ? 'Banco configurado e pronto para uso' 
                      : 'Criar tabelas e dados iniciais necessários'
                    }
                  </p>
                </div>
                <button
                  onClick={databaseStatus?.isSetup ? checkDatabaseStructure : setupDatabase}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    databaseStatus?.isSetup
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {isLoading ? '⏳ Processando...' : 
                   databaseStatus?.isSetup ? '🔄 Verificar' : '🚀 Configurar'}
                </button>
              </div>


              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-yellow-900">Otimização RLS</h3>
                  <p className="text-sm text-yellow-700">
                    Corrigir performance das políticas Row Level Security
                  </p>
                </div>
                <button
                  onClick={fixRLSPerformance}
                  disabled={isLoading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '⏳ Otimizando...' : '⚡ Otimizar RLS'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Setup Results */}
        {setupResults && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📋 Resultados do Setup</h2>
            
            <div className={`p-4 rounded-lg ${
              setupResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${setupResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {setupResults.message}
              </p>
              
              {setupResults.operations && (
                <div className="mt-3 space-y-2">
                  {setupResults.operations.map((op, index) => (
                    <div key={index} className={`text-sm flex items-center gap-2 ${op.success ? 'text-green-700' : 'text-red-700'}`}>
                      {op.success ? (
                        <FiCheckCircle className="w-4 h-4" />
                      ) : (
                        <FiXCircle className="w-4 h-4" />
                      )}
                      {op.message || op.error}
                    </div>
                  ))}
                </div>
              )}
              
              {setupResults.error && (
                <p className="text-sm text-red-600 mt-2">
                  Erro: {setupResults.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RLS Fix Results */}
        {rlsFixResults && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">⚡ Resultados da Otimização RLS</h2>
            
            <div className={`p-4 rounded-lg ${
              rlsFixResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`font-medium ${rlsFixResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {rlsFixResults.message}
              </p>
              
              {rlsFixResults.improvements && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-green-700">Melhorias aplicadas:</p>
                  {rlsFixResults.improvements.map((improvement, index) => (
                    <div key={index} className="text-sm text-green-600">
                      {improvement}
                    </div>
                  ))}
                </div>
              )}
              
              {rlsFixResults.results && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-gray-700">Detalhes das correções:</p>
                  {rlsFixResults.results.map((result, index) => (
                    <div key={index} className={`text-sm flex items-center gap-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.success ? (
                        <FiCheckCircle className="w-4 h-4" />
                      ) : (
                        <FiXCircle className="w-4 h-4" />
                      )}
                      Fix {result.fix}: {result.success ? 'Aplicado' : result.error}
                    </div>
                  ))}
                </div>
              )}
              
              {rlsFixResults.error && (
                <p className="text-sm text-red-600 mt-2">
                  Erro: {rlsFixResults.error}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Database Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Informações do Banco</h2>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Configuração Atual</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• URL: https://gkikgvkapnyfhpwhngxw.supabase.co</li>
                <li>• Projeto: gkikgvkapnyfhpwhngxw</li>
                <li>• Região: us-east-1</li>
                <li>• Versão: PostgreSQL 15</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Tabelas Principais</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• profiles (usuários)</li>
                <li>• agendamento (registros de ponto)</li>
                <li>• empresas (organizações)</li>
                <li>• projetos (projetos)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🏠 Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DatabaseSetupView
