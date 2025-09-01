// Alternativa para conectar ao Supabase usando API REST
// Este arquivo pode ser usado como alternativa se a conexão direta PostgreSQL falhar

export async function testarConexaoSupabase() {
  try {
    const supabaseUrl = 'https://gkikgvkapnyfhpwhngxw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTI5ODk4MDcsImV4cCI6MjAwODU2NTgwN30.R1Roz7_pA6nVwzaCJHHX-whKH5JOrtfzDH4qxZrKtSw'; // Chave anônima para teste
    
    // Testa conexão com o Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/registro?select=id&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const data = await response.json();
    return {
      sucesso: true,
      mensagem: 'Conexão com Supabase REST API estabelecida com sucesso',
      data
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `Erro ao conectar via REST API: ${error.message}`,
      erro: error.toString()
    };
  }
}

export async function inserirRegistroSupabase(dados) {
  try {
    const supabaseUrl = 'https://gkikgvkapnyfhpwhngxw.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraWtndmthcG55Zmhwd2huZ3h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTI5ODk4MDcsImV4cCI6MjAwODU2NTgwN30.R1Roz7_pA6nVwzaCJHHX-whKH5JOrtfzDH4qxZrKtSw'; // Chave anônima para teste
    
    // Convertendo as strings de hora para objetos timestamp
    const horaEntrada = `${dados.dia}T${dados.hora_entrada}:00Z`;
    const horaSaida = `${dados.dia}T${dados.hora_saida}:00Z`;
    
    // Prepara os dados para envio
    const registroData = {
      dia: dados.dia,
      hora_registro: new Date().toISOString(),
      hora_entrada: horaEntrada,
      hora_saida: horaSaida,
      pausa: dados.pausa,
      observacao: dados.observacao || ''
    };
    
    // Insere no Supabase via API REST
    const response = await fetch(`${supabaseUrl}/rest/v1/registro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(registroData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Supabase: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return {
      sucesso: true,
      id: data[0].id,
      mensagem: 'Registro inserido com sucesso via REST API',
      data: data[0]
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `Erro ao inserir via REST API: ${error.message}`,
      erro: error.toString()
    };
  }
}
