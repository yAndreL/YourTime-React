/**
 * Servico de validacao de batidas rodando no server (Express).
 * Usa service_role para bypass RLS e validar regras de negocio.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Calcula distancia Haversine em metros */
function distanciaHaversine(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number') return Infinity;
  const R = 6371000;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Determina estado da jornada com base nas batidas do dia */
function determinarEstadoJornada(batidas) {
  if (!batidas || batidas.length === 0) {
    return { estado: 'nao_iniciada', proximaBatida: 'entrada' };
  }
  const ultimaBatida = batidas[batidas.length - 1];
  switch (ultimaBatida.tipo) {
    case 'entrada':
      return { estado: 'trabalhando', proximaBatida: 'pausa' };
    case 'pausa':
      return { estado: 'em_pausa', proximaBatida: 'retorno' };
    case 'retorno':
      return { estado: 'trabalhando', proximaBatida: 'pausa' };
    case 'saida':
      return { estado: 'encerrada', proximaBatida: null };
    default:
      return { estado: 'nao_iniciada', proximaBatida: 'entrada' };
  }
}

/**
 * Busca batidas do usuario no dia especificado (UTC range).
 * Usa service_role para bypass RLS.
 */
async function buscarBatidasDoDia(userId, diaISO) {
  const { data, error } = await supabase
    .from('batidas')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp_servidor', `${diaISO}T00:00:00Z`)
    .lt('timestamp_servidor', `${diaISO}T23:59:59.999Z`)
    .order('timestamp_servidor', { ascending: true });

  if (error) throw new Error(`Erro ao buscar batidas: ${error.message}`);
  return data || [];
}

/**
 * Obtem estado atual da jornada do usuario no dia.
 * Dia padrao: hoje em UTC.
 */
async function obterEstadoAtualDoDia(userId, diaISO = null) {
  const dia = diaISO || new Date().toISOString().split('T')[0];
  const batidas = await buscarBatidasDoDia(userId, dia);
  return determinarEstadoJornada(batidas);
}

const TRANSICOES_VALIDAS = {
  'nao_iniciada': ['entrada'],
  'trabalhando': ['pausa', 'saida'],
  'em_pausa': ['retorno'],
  'encerrada': []
};

const ERROS_TRANSICAO = {
  'nao_iniciada_saida': 'Nao e possivel registrar saida sem entrada',
  'nao_iniciada_pausa': 'Nao e possivel registrar pausa sem entrada',
  'nao_iniciada_retorno': 'Nao e possivel registrar retorno sem entrada',
  'trabalhando_entrada': 'Jornada ja iniciada. Registre pausa ou saida',
  'trabalhando_retorno': 'Nao e necessario retornar, voce ja esta trabalhando',
  'em_pausa_entrada': 'Ja existe entrada registrada. Voce esta em pausa',
  'em_pausa_pausa': 'Voce ja esta em pausa',
  'em_pausa_saida': 'Registre retorno antes de registrar saida',
  'encerrada_entrada': 'Jornada ja encerrada. Nao e possivel registrar novas batidas hoje',
  'encerrada_pausa': 'Jornada ja encerrada',
  'encerrada_retorno': 'Jornada ja encerrada',
  'encerrada_saida': 'Jornada ja encerrada'
};

/**
 * Valida se a transicao de estado e permitida.
 * @returns { valido: boolean, erro?: string }
 */
function validarTransicao(estadoAtual, tipoSolicitado) {
  const permitidas = TRANSICOES_VALIDAS[estadoAtual] || [];
  if (permitidas.includes(tipoSolicitado)) {
    return { valido: true };
  }
  const chaveErro = `${estadoAtual}_${tipoSolicitado}`;
  return { valido: false, erro: ERROS_TRANSICAO[chaveErro] || `Transicao invalida: ${tipoSolicitado}` };
}

/**
 * Valida que o projeto existe e esta ativo.
 * @returns { valido: boolean, erro?: string, projeto?: object }
 */
async function validarProjetoAtivo(projetoId) {
  if (!projetoId) return { valido: true };
  const { data, error } = await supabase
    .from('projetos')
    .select('id, nome, status, empresa_id, superior_empresa_id, geocerca_latitude, geocerca_longitude, geocerca_raio_metros')
    .eq('id', projetoId)
    .maybeSingle();

  if (error) return { valido: false, erro: 'Erro ao validar projeto' };
  if (!data) return { valido: false, erro: 'Projeto nao encontrado' };
  if (data.status !== 'ativo') return { valido: false, erro: 'Projeto nao esta mais ativo' };

  return { valido: true, projeto: data };
}

/**
 * Valida geocerca do projeto.
 * @returns { dentro: boolean, distancia?: number, erro?: string }
 */
function validarGeocercaProjeto(projeto, lat, lon) {
  if (!projeto || projeto.geocerca_latitude == null) return { dentro: true }; // sem geocerca
  if (lat == null || lon == null) return { dentro: false, erro: 'Localizacao obrigatoria para projetos com geocerca' };

  const distancia = distanciaHaversine(
    lat, lon,
    parseFloat(projeto.geocerca_latitude),
    parseFloat(projeto.geocerca_longitude)
  );
  const raio = projeto.geocerca_raio_metros || 100;

  if (distancia > raio) {
    return { dentro: false, distancia: Math.round(distancia), raio, erro: `Voce esta fora da geocerca do projeto (${Math.round(distancia)}m do centro, raio maximo: ${raio}m)` };
  }

  return { dentro: true, distancia: Math.round(distancia) };
}

/**
 * Valida tipo de batida.
 */
function validarTipoBatida(tipo) {
  const tiposValidos = ['entrada', 'pausa', 'retorno', 'saida'];
  if (!tiposValidos.includes(tipo)) {
    return { valido: false, erro: `Tipo de batida invalido: ${tipo}` };
  }
  return { valido: true };
}

export default {
  distanciaHaversine,
  determinarEstadoJornada,
  obterEstadoAtualDoDia,
  validarTransicao,
  validarProjetoAtivo,
  validarGeocercaProjeto,
  validarTipoBatida,
  supabase
};
