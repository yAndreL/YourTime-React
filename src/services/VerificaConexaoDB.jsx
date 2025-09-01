import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function VerificaConexaoDB() {
  const [serverStatus, setServerStatus] = useState('verificando');
  const [formData, setFormData] = useState({
    dia: '',
    hora_entrada: '',
    hora_saida: '',
    pausa: '',
    observacao: ''
  })
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [useRestApi, setUseRestApi] = useState(false)
  const [showDiagnostico, setShowDiagnostico] = useState(false)
  const [diagnosticoInfo, setDiagnosticoInfo] = useState(null)
  const [fetchTestResult, setFetchTestResult] = useState(null)

  // Verificar status do servidor ao carregar o componente
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        console.log("[STATUS] Verificando status do servidor Express...");
        const response = await fetch('http://localhost:3001/teste', { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors',
          // Define um timeout curto para não travar a interface
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("[STATUS] Servidor respondeu:", data);
          setServerStatus('online');
        } else {
          console.log("[STATUS] Servidor respondeu com erro:", response.status);
          setServerStatus('erro');
        }
      } catch (error) {
        console.error("[STATUS] Erro ao verificar servidor:", error);
        setServerStatus('offline');
      }
    };
    
    checkServerStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const rodarDiagnostico = async () => {
    setLoading(true)
    setShowDiagnostico(true)
    setDiagnosticoInfo({status: 'executando', mensagem: 'Executando diagnóstico de conexão...'})
    
    // Armazenar resultados do diagnóstico
    const resultados = {
      dnsLookup: null,
      pingResult: null,
      portCheck: null,
      sslCheck: null
    };
    
    try {
      // 1. Verificar status do servidor
      setDiagnosticoInfo({status: 'executando', mensagem: 'Verificando servidor...'})
      try {
        // Usar a rota de diagnóstico direta que já sabemos que funciona
        const url = 'http://localhost:3001/api/diag-server';
        console.log('[DEBUG] Enviando requisição para', url);
        
        // Adicionar cabeçalhos explícitos para evitar comportamento de cache
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'fetch'
          }
        });
        
        console.log('[DEBUG] URL completa após redirecionamentos:', response.url);
        console.log('[DEBUG] Resposta recebida:', response.status, response.statusText);
        console.log('[DEBUG] Headers da resposta:', Object.fromEntries([...response.headers.entries()]));
        
        // Verificar o tipo de conteúdo
        const contentType = response.headers.get('content-type');
        console.log('[DEBUG] Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('[ERROR] Resposta não-JSON recebida:', text.substring(0, 200) + '...');
          throw new Error(`Resposta inválida: ${response.status} ${response.statusText} (Content-Type: ${contentType || 'não especificado'})`);
        }
        
        const data = await response.json();
        console.log('[DEBUG] Dados recebidos:', data);
        resultados.serverInfo = data;
      } catch (error) {
        console.error('[ERROR] Erro na requisição:', error);
        resultados.serverInfo = {erro: error.message};
      }
      
      setDiagnosticoInfo({
        status: 'concluido', 
        mensagem: 'Diagnóstico concluído',
        resultados
      });
    } catch (error) {
      setDiagnosticoInfo({
        status: 'erro', 
        mensagem: `Erro no diagnóstico: ${error.message}`,
        erro: error
      });
    } finally {
      setLoading(false)
    }
  }

  const testarConexaoSimples = async () => {
    setLoading(true)
    setResultado(null)
    setErro(null)

    try {
      console.log('Iniciando teste de conexão simples...')
      
      // Primeiro teste: verificar se o host é acessível
      try {
        await fetch('http://localhost:3001', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        console.log('[DEBUG] O servidor localhost:3001 está acessível');
      } catch (networkError) {
        console.error('[ERROR] Servidor inacessível:', networkError);
        throw new Error(`Servidor inacessível: ${networkError.message}`);
      }
      
      // Usar a URL direta que estava funcionando anteriormente
      const url = 'http://localhost:3001/teste';
      
      console.log(`[DEBUG] Enviando requisição GET para: ${url}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors', // Explicitamente definir o modo CORS
        credentials: 'omit'
      })
      console.log(`[DEBUG] Headers da resposta:`, Object.fromEntries([...response.headers.entries()]))

      console.log('[DEBUG] Resposta recebida:', response.status, response.statusText)
      console.log('[DEBUG] URL final após redirecionamentos:', response.url)
      
      // Verifica se a resposta não é JSON para evitar erro de parsing
      const contentType = response.headers.get('content-type')
      console.log('[DEBUG] Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[ERROR] Resposta não-JSON recebida:', text.substring(0, 200) + '...')
        console.error('[ERROR] Tamanho total da resposta:', text.length)
        throw new Error(`Resposta inválida do servidor: ${response.status} ${response.statusText} (Content-Type: ${contentType || 'não especificado'})`)
      }

      const data = await response.json()
      console.log('Dados recebidos:', data)
      
      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao conectar com o banco de dados')
      }
      
      setResultado({
        ...data,
        mensagem: 'Teste de conexão bem-sucedido!'
      })
    } catch (error) {
      console.error('Erro no teste de conexão:', error)
      setErro(error.message || 'Erro ao conectar com o banco de dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResultado(null)
    setErro(null)

    try {
      // Validação dos campos antes de enviar
      if (!formData.dia || !formData.hora_entrada || !formData.hora_saida || !formData.pausa) {
        throw new Error('Por favor, preencha todos os campos obrigatórios')
      }

      console.log('[DEBUG] Enviando dados para verificar conexão:', formData)
      console.log('[DEBUG] JSON enviado:', JSON.stringify(formData))
      const response = await fetch('/api/verificar-conexao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      console.log('[DEBUG] Resposta recebida:', response.status, response.statusText)
      console.log('[DEBUG] URL final após redirecionamentos:', response.url)
      console.log('[DEBUG] Headers da resposta:', Object.fromEntries([...response.headers.entries()]))
      
      // Verifica se a resposta não é JSON para evitar erro de parsing
      const contentType = response.headers.get('content-type')
      console.log('[DEBUG] Content-Type:', contentType)
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[ERROR] Resposta não-JSON recebida:', text.substring(0, 200) + '...')
        console.error('[ERROR] Tamanho total da resposta:', text.length)
        throw new Error(`Resposta inválida do servidor: ${response.status} ${response.statusText} (Content-Type: ${contentType || 'não especificado'})`)
      }

      const data = await response.json()
      console.log('Dados recebidos:', data)
      
      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro ao conectar com o banco de dados')
      }
      
      setResultado(data)
    } catch (error) {
      console.error('Erro:', error)
      setErro(error.message || 'Erro ao conectar com o banco de dados')
    } finally {
      setLoading(false)
    }
  }

  const formatarData = () => {
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const dia = String(hoje.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-center text-gray-800">
              Verificar Conexão com Banco de Dados
            </h1>
            <div className="flex items-center">
              <span className="text-sm mr-2">API:</span>
              {serverStatus === 'verificando' && (
                <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full" title="Verificando..."></span>
              )}
              {serverStatus === 'online' && (
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full" title="Servidor online"></span>
              )}
              {serverStatus === 'offline' && (
                <span className="inline-block w-3 h-3 bg-red-500 rounded-full" title="Servidor offline"></span>
              )}
              {serverStatus === 'erro' && (
                <span className="inline-block w-3 h-3 bg-orange-500 rounded-full" title="Erro no servidor"></span>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data do Registro
              </label>
              <input 
                type="date"
                name="dia"
                value={formData.dia || formatarData()}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Entrada
              </label>
              <input 
                type="time"
                name="hora_entrada"
                value={formData.hora_entrada}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora de Saída
              </label>
              <input 
                type="time"
                name="hora_saida"
                value={formData.hora_saida}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempo de Pausa (horas:minutos)
              </label>
              <input 
                type="time"
                name="pausa"
                value={formData.pausa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação
              </label>
              <textarea 
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Observações sobre o registro"
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-2 px-4 rounded-md transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {loading ? 'Processando...' : 'Enviar Registro'}
            </button>

            <button 
              type="button"
              disabled={loading}
              onClick={testarConexaoSimples}
              className={`w-full mt-2 font-bold py-2 px-4 rounded-md transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? 'Testando...' : 'Apenas Testar Conexão'}
            </button>
            {/* Opções avançadas */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useRestApi"
                    checked={useRestApi}
                    onChange={(e) => setUseRestApi(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useRestApi" className="ml-2 text-sm text-gray-700">
                    Usar Supabase REST API (alternativa)
                  </label>
                </div>
                <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={rodarDiagnostico}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Executar Diagnóstico de Conexão
                </button>
                <button
                  type="button"
                  onClick={() => window.open('http://localhost:3001/teste', '_blank')}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  Testar API Direto (Browser)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setFetchTestResult({status: 'carregando', message: 'Testando conexão...'});
                      const response = await fetch('http://localhost:3001/teste', {
                        method: 'GET',
                        headers: {'Accept': 'application/json'},
                        mode: 'cors'
                      });
                      const data = await response.json();
                      setFetchTestResult({status: 'sucesso', message: 'Conexão OK', data});
                    } catch (error) {
                      console.error('Erro no teste de API:', error);
                      setFetchTestResult({status: 'erro', message: `Erro: ${error.message}`});
                    }
                  }}
                  className="text-purple-600 hover:text-purple-800 text-sm ml-2"
                >
                  Testar API (Component)
                </button>
                <button
                  type="button"
                  onClick={() => window.open('http://localhost:3001/', '_blank')}
                  className="text-orange-600 hover:text-orange-800 text-sm ml-2"
                >
                  Testar Raiz
                </button>
              </div>
              </div>
            </div>
          </form>
          
          {fetchTestResult && (
            <div className={`mt-2 p-3 rounded-md text-sm ${
              fetchTestResult.status === 'carregando' ? 'bg-blue-50 text-blue-800' : 
              fetchTestResult.status === 'sucesso' ? 'bg-green-50 text-green-800' : 
              'bg-red-50 text-red-800'
            }`}>
              <div className="font-bold">{fetchTestResult.message}</div>
              {fetchTestResult.data && (
                <pre className="mt-1 text-xs bg-gray-50 p-1 rounded">
                  {JSON.stringify(fetchTestResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {resultado && (
            <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-md">
              <h3 className="font-bold">Conexão Bem-sucedida!</h3>
              {resultado.id && <p>ID do registro: {resultado.id}</p>}
              {resultado.timestamp && <p>Timestamp do servidor: {new Date(resultado.timestamp).toLocaleString()}</p>}
              <p>{resultado.mensagem || 'Operação realizada com sucesso!'}</p>
              {resultado.postgresError && (
                <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 rounded-md text-sm">
                  <p><span className="font-semibold">Observação:</span> A conexão direta PostgreSQL falhou, mas a REST API funcionou.</p>
                  <p>Erro original: {resultado.postgresError}</p>
                </div>
              )}
            </div>
          )}
          
          {erro && (
            <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-md">
              <h3 className="font-bold">Erro na Conexão</h3>
              <p>{erro}</p>
              <div className="mt-2 text-sm">
                <p>Possíveis causas:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Credenciais de conexão incorretas</li>
                  <li>Tabela não existe no banco de dados</li>
                  <li>Firewall bloqueando a conexão</li>
                  <li>Servidor de banco de dados indisponível</li>
                  <li>Erro de sintaxe na consulta SQL</li>
                </ul>
                <p className="mt-2">Tente a opção "Usar Supabase REST API" como alternativa.</p>
              </div>
            </div>
          )}
          
          {showDiagnostico && diagnosticoInfo && (
            <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-md">
              <h3 className="font-bold flex items-center justify-between">
                Diagnóstico de Conexão
                <button 
                  onClick={() => setShowDiagnostico(false)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Fechar
                </button>
              </h3>
              
              <div className="mt-2">
                <p className="mb-2">
                  {diagnosticoInfo.status === 'executando' ? (
                    <span className="inline-flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {diagnosticoInfo.mensagem}
                    </span>
                  ) : diagnosticoInfo.status === 'concluido' ? (
                    <span className="text-green-600">{diagnosticoInfo.mensagem}</span>
                  ) : (
                    <span className="text-red-600">{diagnosticoInfo.mensagem}</span>
                  )}
                </p>
                
                {diagnosticoInfo.resultados && (
                  <div className="text-sm space-y-2 mt-3">
                    <div className="p-2 bg-white rounded border border-blue-100">
                      <h4 className="font-medium mb-1">Informações do Servidor:</h4>
                      <pre className="text-xs overflow-auto max-h-32 p-1 bg-gray-50">
                        {JSON.stringify(diagnosticoInfo.resultados.serverInfo || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 text-sm">
                  <h4 className="font-medium">Recomendações:</h4>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Verifique se o host do banco de dados está acessível pela sua rede</li>
                    <li>Confirme se as credenciais do banco estão corretas</li>
                    <li>Verifique se seu IP está na whitelist do serviço Supabase</li>
                    <li>Se o problema persistir, use a opção "Usar Supabase REST API"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              to="/" 
              className="text-gray-500 hover:text-gray-600 text-sm transition-colors"
            >
              ← Voltar ao Dashboard
            </Link>
            <Link 
              to="/database-setup" 
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              🔧 Configuração do Banco Supabase
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerificaConexaoDB
