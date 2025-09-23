// RLSHelper.jsx
// Componente auxiliar para ajudar com problemas de RLS (Row Level Security)

import { useState } from 'react'

function RLSHelper() {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="text-yellow-600 mr-3">⚠️</div>
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800 mb-2">
            Problema de Segurança Detectado
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            A tabela "projetos" tem políticas de segurança (RLS) que impedem a criação de novos registros através da aplicação.
          </p>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-yellow-800 hover:text-yellow-900 underline"
          >
            {showDetails ? 'Ocultar' : 'Mostrar'} soluções
          </button>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">Como resolver:</h4>

              <div className="space-y-3 text-sm text-yellow-700">
                <div>
                  <strong>✅ Solução Automática (Implementada):</strong>
                  <p className="mt-1">O sistema já tenta múltiplas abordagens automaticamente:</p>
                  <ul className="list-disc list-inside mt-1 ml-2">
                    <li>Service Role Key (se configurada)</li>
                    <li>Cliente padrão com políticas RLS</li>
                    <li>Fallback para desenvolvimento</li>
                  </ul>
                </div>

                <div>
                  <strong>🔑 Configuração Manual (Opcional):</strong>
                  <p className="mt-1">Para máxima segurança, configure:</p>
                  <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                    VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
                  </div>
                  <p className="text-xs mt-1">Dashboard → Settings → API → service_role</p>
                </div>

                <div>
                  <strong>📋 Política RLS para Produção:</strong>
                  <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-xs">
                    CREATE POLICY "Allow authenticated users" ON projetos<br />
                    FOR ALL TO authenticated USING (true) WITH CHECK (true);
                  </div>
                  <p className="text-xs mt-1">Arquivo: fix-rls-policy.sql</p>
                </div>

                <div>
                  <strong>🚨 Política para Desenvolvimento:</strong>
                  <div className="bg-red-50 p-2 rounded mt-1 font-mono text-xs border border-red-200">
                    ALTER TABLE projetos DISABLE ROW LEVEL SECURITY;
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Use apenas em desenvolvimento!
                  </p>
                </div>

                <div>
                  <strong>💡 Diagnóstico:</strong> Se ainda falhar, verifique no console do navegador os logs detalhados de debug.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RLSHelper
