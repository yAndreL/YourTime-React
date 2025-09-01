import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import apiRoutes from './backend/routes/apiRoutes.js';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware com CORS mais permissivo
app.use(cors({
  origin: true, // Permite qualquer origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cache-Control']
}));

// Adicionar cabeçalhos CORS manualmente para garantir
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  
  // Responder imediatamente a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log('[DEBUG] Requisição OPTIONS recebida (preflight)');
    return res.status(200).send();
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging para depuração
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📡 ${timestamp} - ${req.method} ${req.url}`);
  console.log(`[SERVIDOR-DEBUG] Headers da requisição:`, req.headers);
  console.log(`[SERVIDOR-DEBUG] Path completo: ${req.path}`);
  console.log(`[SERVIDOR-DEBUG] Query params:`, req.query);
  
  // Debug para mostrar body em requisições POST
  if (req.method === 'POST' && req.body) {
    console.log('[DEBUG] Request Body:', req.body);
  }
  
  // Garantir que Content-Type está definido como application/json para todas as respostas da API
  res.on('finish', () => {
    console.log(`[SERVIDOR-DEBUG] Resposta enviada: ${res.statusCode} ${res.statusMessage}`);
    console.log(`[SERVIDOR-DEBUG] Headers da resposta:`, res.getHeaders());
  });
  
  next();
});

// Rota específica para diagnóstico (para garantir que está sendo registrada)
app.get('/api/diagnostico', (req, res, next) => {
  console.log('[SERVIDOR] Rota específica /api/diagnostico acessada');
  console.log('[SERVIDOR] Query params:', req.query);
  next(); // Passa para o processamento em apiRoutes
});

// Rotas da API
app.use('/api', apiRoutes);

// Rota para a raiz em desenvolvimento
app.get('/', (req, res) => {
  console.log('[SERVIDOR] Rota raiz acessada');
  res.json({ 
    message: 'API do YourTime está funcionando!',
    endpoints: {
      testConnection: '/api/teste-conexao',
      verifyConnection: '/api/verificar-conexao',
      diagnostics: '/api/diagnostico',
      directTest: '/api/diag-server',
      simpleTest: '/teste'
    }
  });
});

// Rota de teste simples sem prefixo /api
app.get('/teste', (req, res) => {
  console.log('[SERVIDOR] Rota de teste simples acessada');
  res.json({ 
    success: true,
    message: 'Teste simples funcionou!',
    timestamp: new Date().toISOString()
  });
});

// Rota adicional de diagnóstico para testes diretos
app.get('/api/diag-server', (req, res) => {
  console.log('[SERVIDOR] Rota de diagnóstico direta acessada');
  
  const info = {
    serverInfo: {
      timestamp: new Date().toISOString(),
      node: process.version,
      platform: process.platform,
      message: "Teste de conexão com o servidor bem-sucedido!"
    },
    reqInfo: {
      url: req.url,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      query: req.query
    }
  };
  
  // Garantir o tipo de conteúdo e formato corretos
  console.log('[SERVIDOR] Enviando resposta JSON:', info);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(info);
});

// Para produção - servir arquivos estáticos do build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// Middleware para rotas não encontradas no modo de desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[ERRO] Rota da API não encontrada: ${req.method} ${req.originalUrl}`);
      console.log('[DEBUG] Rotas API disponíveis:');
      console.log('- GET /api/teste-conexao');
      console.log('- POST /api/verificar-conexao');
      console.log('- GET /api/diagnostico');
      
      // Responder com JSON em vez de HTML para rotas de API não encontradas
      return res.status(404).json({ 
        erro: 'Rota da API não encontrada',
        path: req.originalUrl,
        method: req.method,
        rutasDisponiveis: [
          'GET /api/teste-conexao',
          'POST /api/verificar-conexao', 
          'GET /api/diagnostico'
        ]
      });
    }
    next();
  });
}

// Iniciar o servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Rotas disponíveis:');
  console.log('- GET /api/teste-conexao');
  console.log('- POST /api/verificar-conexao');
  console.log('- GET /api/diagnostico');
});

// Lidar com encerramento adequado
process.on('SIGINT', () => {
  console.log('Recebido SIGINT. Fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado.');
    process.exit(0);
  });
});

// Manter o processo em execução
console.log("Servidor Express está ativo e ouvindo conexões...");

// Para uso em outros arquivos, se necessário
export { app, server };
