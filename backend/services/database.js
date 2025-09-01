import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração da conexão com o PostgreSQL usando variáveis de ambiente
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false // Necessário para conexões com SSL do Supabase
  } : false,
  // Configurações de timeout
  connectionTimeoutMillis: 10000, // 10 segundos
  query_timeout: 10000,
  statement_timeout: 10000
});

export async function testarConexao() {
  try {
    console.log('🔄 Tentando conectar ao banco de dados...');
    console.log(`🌐 Tentando conectar a: ${pool.options.host}:${pool.options.port}`);
    
    // Tente estabelecer uma conexão com timeout mais curto
    const client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de conexão manual - possível problema de rede')), 5000)
      )
    ]);
    
    console.log('🔎 Verificando conexão com SELECT NOW()...');
    const resultado = await client.query('SELECT NOW()');
    
    console.log('📋 Verificando estrutura da tabela...');
    const tabelaResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'registro'
      );
    `);
    
    const tabelaExiste = tabelaResult.rows[0].exists;
    
    let estruturaTabela = null;
    if (tabelaExiste) {
      const estruturaResult = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'registro';
      `);
      estruturaTabela = estruturaResult.rows;
    }
    
    client.release();
    console.log('✅ Teste de conexão completado com sucesso');
    
    return {
      sucesso: true,
      mensagem: 'Conexão com o banco de dados estabelecida com sucesso',
      timestamp: resultado.rows[0].now,
      tabelaExiste,
      estruturaTabela,
      info: {
        host: pool.options.host || 'Usando connectionString',
        database: pool.options.database || 'Usando connectionString',
        user: pool.options.user || 'Usando connectionString'
      }
    };
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    
    // Verificação de tipos de erros comuns
    let dica = '';
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      dica = 'Isso parece ser um problema de rede ou firewall. Verifique sua conexão com a internet e se o host do banco de dados está acessível.';
    } else if (error.code === 'ENOTFOUND') {
      dica = 'O servidor de banco de dados não foi encontrado. Verifique se o nome do host está correto.';
    } else if (error.code === '28P01') {
      dica = 'Senha incorreta para o usuário do banco de dados.';
    } else if (error.code === '3D000') {
      dica = 'O banco de dados especificado não existe.';
    }
    
    // Teste conexão alternativa (sem SSL)
    console.log('🔄 Tentando conexão alternativa sem SSL...');
    try {
      const testPool = new Pool({
        host: pool.options.host,
        port: pool.options.port,
        user: pool.options.user,
        password: pool.options.password,
        database: pool.options.database,
        connectionTimeoutMillis: 5000
      });
      
      await testPool.query('SELECT NOW()');
      dica = 'A conexão sem SSL funcionou! O problema pode estar relacionado à configuração SSL.';
    } catch (testError) {
      console.error('❌ Conexão alternativa também falhou:', testError.message);
    }
    
    return {
      sucesso: false,
      mensagem: `Erro ao conectar: ${error.message}`,
      erro: error.toString(),
      detalhes: {
        name: error.name,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      dica
    };
  }
}

export async function inserirRegistro(dados) {
  let client;
  try {
    console.log('🔄 Tentando conectar ao banco de dados para inserção...');
    client = await pool.connect();
    
    // Primeiro verificar se a tabela existe
    console.log('🔎 Verificando se a tabela registro existe...');
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'registro'
      );
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('❌ Tabela registro não existe. Tentando criar...');
      // A tabela não existe, vamos tentar criá-la
      await client.query(`
        CREATE TABLE IF NOT EXISTS registro (
          id SERIAL PRIMARY KEY,
          dia DATE NOT NULL,
          hora_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          hora_entrada TIMESTAMPTZ NOT NULL,
          hora_saida TIMESTAMPTZ NOT NULL,
          pausa TIME NOT NULL,
          observacao TEXT
        );
      `);
      console.log('✅ Tabela registro criada com sucesso');
    }
    
    const query = `
      INSERT INTO registro (dia, hora_registro, hora_entrada, hora_saida, pausa, observacao)
      VALUES ($1, NOW(), $2, $3, $4, $5)
      RETURNING id
    `;
    
    // Convertendo as strings de hora para objetos timestamp
    console.log('🔄 Formatando dados para inserção...');
    const horaEntrada = `${dados.dia}T${dados.hora_entrada}:00Z`;
    const horaSaida = `${dados.dia}T${dados.hora_saida}:00Z`;
    
    const values = [
      dados.dia,
      horaEntrada,
      horaSaida,
      dados.pausa,
      dados.observacao || ''
    ];
    
    console.log('💾 Executando query de inserção...');
    console.log('📝 Query:', query);
    console.log('📊 Valores:', values);
    
    const resultado = await client.query(query, values);
    console.log('✅ Query executada com sucesso');
    
    return {
      sucesso: true,
      id: resultado.rows[0].id,
      mensagem: 'Registro inserido com sucesso',
      data: {
        dia: dados.dia,
        hora_entrada: horaEntrada,
        hora_saida: horaSaida
      }
    };
  } catch (error) {
    console.error('❌ Erro ao inserir registro:', error);
    return {
      sucesso: false,
      mensagem: `Erro ao inserir: ${error.message}`,
      erro: error.toString(),
      detalhes: {
        name: error.name,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    };
  } finally {
    if (client) {
      console.log('🔄 Liberando conexão com o banco...');
      client.release();
    }
  }
}

export default {
  testarConexao,
  inserirRegistro
};
