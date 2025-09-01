// Este arquivo precisa ser configurado com seu servidor Express ou similar
// Para fins deste exemplo, você pode criar um servidor Express separado ou usar middleware no Vite

import express from 'express';
import { inserirRegistro, testarConexao } from './database.js';
import { testarConexaoSupabase, inserirRegistroSupabase } from './supabase-api.js';

const router = express.Router();
// Flag para alternar entre conexão direta PostgreSQL e Supabase REST API
let usarSupabaseRest = false;

// Rota para verificar a conexão
router.get('/teste-conexao', async (req, res) => {
  console.log('🔍 Recebida solicitação de teste de conexão');
  console.log('[DEBUG] Headers recebidos:', req.headers);
  console.log('[DEBUG] Query params:', req.query);
  
  // Verifica se deve usar a API REST
  if (req.query.useRestApi === 'true') {
    usarSupabaseRest = true;
    console.log('🔀 Alterando para modo API REST Supabase');
  } else if (req.query.useRestApi === 'false') {
    usarSupabaseRest = false;
    console.log('🔀 Alterando para modo PostgreSQL direto');
  }
  
  try {
    if (usarSupabaseRest) {
      console.log('🌐 Testando conexão via Supabase REST API...');
      const resultado = await testarConexaoSupabase();
      console.log('📊 Resultado do teste via REST API:', resultado);
      
      if (resultado.sucesso) {
        console.log('✅ Conexão REST bem-sucedida');
        console.log('[DEBUG] Enviando resposta JSON com status 200:', resultado);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(resultado);
      } else {
        console.log('❌ Falha na conexão REST');
        res.status(500).json(resultado);
      }
    } else {
      console.log('🌐 Testando conexão direta com o banco de dados PostgreSQL...');
      const resultado = await testarConexao();
      console.log('📊 Resultado do teste de conexão PostgreSQL:', resultado);
      
      if (resultado.sucesso) {
        console.log('✅ Conexão PostgreSQL bem-sucedida');
        console.log('[DEBUG] Enviando resposta JSON com status 200:', resultado);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(resultado);
      } else {
        console.log('❌ Falha na conexão PostgreSQL. Tentando REST API...');
        
        // Tentar automaticamente a alternativa REST API
        try {
          const resultadoRest = await testarConexaoSupabase();
          if (resultadoRest.sucesso) {
            console.log('✅ Conexão via REST API bem-sucedida como fallback');
            usarSupabaseRest = true; // Ativar modo REST API
            resultadoRest.mensagem = 'Conexão PostgreSQL falhou, mas API REST funcionou! Modo REST ativado.';
            resultadoRest.postgresError = resultado.mensagem;
            console.log('[DEBUG] Enviando resposta JSON com status 200:', resultadoRest);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json(resultadoRest);
          } else {
            console.log('❌ Ambos os métodos falharam');
            res.status(500).json({
              ...resultado,
              restApiTambemFalhou: true,
              mensagem: `PostgreSQL: ${resultado.mensagem}. REST API: ${resultadoRest.mensagem}`
            });
          }
        } catch (restError) {
          console.error('💥 Erro durante o teste de conexão REST:', restError);
          res.status(500).json(resultado); // Retorna o erro PostgreSQL original
        }
      }
    }
  } catch (error) {
    console.error('💥 Erro durante o teste de conexão:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`
    });
  }
});

// Rota para inserir um registro
router.post('/verificar-conexao', async (req, res) => {
  console.log('📝 Recebida solicitação para inserir registro');
  console.log('[DEBUG] Headers recebidos:', req.headers);
  console.log('[DEBUG] Content-Type:', req.headers['content-type']);
  console.log('[DEBUG] Body raw:', req.body);
  
  try {
    const dados = req.body;
    console.log('📦 Dados recebidos:', dados);
    
    if (!dados.dia || !dados.hora_entrada || !dados.hora_saida || !dados.pausa) {
      console.log('⚠️ Dados incompletos');
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Dados incompletos. Por favor, preencha todos os campos obrigatórios.'
      });
    }
    
    if (usarSupabaseRest) {
      // Usar REST API do Supabase
      console.log('💾 Tentando inserir registro via REST API...');
      const resultado = await inserirRegistroSupabase(dados);
      console.log('📊 Resultado da inserção REST API:', resultado);
      
      if (resultado.sucesso) {
        console.log('✅ Registro inserido com sucesso via REST API');
        console.log('[DEBUG] Enviando resposta JSON com status 201:', resultado);
        res.setHeader('Content-Type', 'application/json');
        res.status(201).json(resultado);
      } else {
        console.log('❌ Falha ao inserir registro via REST API');
        res.status(500).json(resultado);
      }
    } else {
      // Usar conexão direta PostgreSQL
      console.log('💾 Tentando inserir registro no banco de dados PostgreSQL...');
      const resultado = await inserirRegistro(dados);
      console.log('📊 Resultado da inserção PostgreSQL:', resultado);
      
      if (resultado.sucesso) {
        console.log('✅ Registro inserido com sucesso via PostgreSQL');
        console.log('[DEBUG] Enviando resposta JSON com status 201:', resultado);
        res.setHeader('Content-Type', 'application/json');
        res.status(201).json(resultado);
      } else {
        console.log('❌ Falha ao inserir registro via PostgreSQL. Tentando REST API...');
        
        try {
          const resultadoRest = await inserirRegistroSupabase(dados);
          if (resultadoRest.sucesso) {
            console.log('✅ Inserção via REST API bem-sucedida como fallback');
            usarSupabaseRest = true; // Ativar modo REST API
            resultadoRest.mensagem = 'Inserção PostgreSQL falhou, mas API REST funcionou! Modo REST ativado.';
            resultadoRest.postgresError = resultado.mensagem;
            console.log('[DEBUG] Enviando resposta JSON com status 201:', resultadoRest);
            res.setHeader('Content-Type', 'application/json');
            res.status(201).json(resultadoRest);
          } else {
            console.log('❌ Ambos os métodos de inserção falharam');
            res.status(500).json({
              ...resultado,
              restApiTambemFalhou: true,
              mensagem: `PostgreSQL: ${resultado.mensagem}. REST API: ${resultadoRest.mensagem}`
            });
          }
        } catch (restError) {
          console.error('💥 Erro durante a inserção via REST API:', restError);
          res.status(500).json(resultado); // Retorna o erro PostgreSQL original
        }
      }
    }
  } catch (error) {
    console.error('💥 Erro durante a inserção do registro:', error);
    res.status(500).json({
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`
    });
  }
});

// Rota para diagnóstico de conexão
router.get('/diagnostico', async (req, res) => {
  console.log('🔍 Recebida solicitação de diagnóstico na rota /api/diagnostico');
  console.log('[DEBUG] Headers recebidos:', req.headers);
  console.log('[DEBUG] Query params:', req.query);
  console.log('[DEBUG] URL completa:', req.originalUrl);
  console.log('[DEBUG] Método:', req.method);
  const action = req.query.action;
  console.log('[DEBUG] Action:', action);
  
  if (action === 'check-server') {
    try {
      console.log('[DEBUG] Processando diagnóstico check-server');
      // Informações do servidor e conexão
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
      };
      
      // Teste básico de conexão
      try {
        const resultadoConexao = await testarConexao();
        info.conexaoTeste = resultadoConexao;
      } catch (error) {
        info.conexaoTeste = { sucesso: false, erro: error.message };
      }
      
      // Tentar DNS lookup usando módulos disponíveis
      try {
        const { lookup } = require('dns');
        const { promisify } = require('util');
        const lookupAsync = promisify(lookup);
        
        const dnsResult = await lookupAsync('db.gkikgvkapnyfhpwhngxw.supabase.co');
        info.dnsLookup = {
          sucesso: true,
          address: dnsResult.address,
          family: dnsResult.family
        };
      } catch (error) {
        info.dnsLookup = {
          sucesso: false,
          erro: error.message
        };
      }
      
      console.log('[DEBUG] Enviando resposta JSON com status 200');
      // Sanitizar os dados antes de enviar
      const safeInfo = JSON.parse(JSON.stringify(info));
      console.log('Dados sanitizados:', typeof safeInfo);
      
      // Garantir que estamos enviando JSON adequadamente
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(safeInfo);
    } catch (error) {
      res.status(500).json({
        sucesso: false,
        mensagem: `Erro no diagnóstico: ${error.message}`
      });
    }
  } else {
    res.status(400).json({
      sucesso: false,
      mensagem: 'Ação de diagnóstico não especificada ou inválida'
    });
  }
});

// Certificando-se de exportar corretamente
const apiRoutes = router;
export default apiRoutes;
