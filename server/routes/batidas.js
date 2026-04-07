import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import batidaValidationService from '../services/batidaValidationService.js';

const router = Router();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limiting: max 10 batidas por hora por userId
if (!global.batidaAttempts) global.batidaAttempts = {};
const BATIDA_RATE_WINDOW = 60 * 60 * 1000; // 1 hora
const BATIDA_RATE_MAX = 10;

function checkBatidaRateLimit(userId) {
  const now = Date.now();
  const key = `batida_${userId}`;
  if (!global.batidaAttempts[key]) global.batidaAttempts[key] = [];
  global.batidaAttempts[key] = global.batidaAttempts[key].filter(t => now - t < BATIDA_RATE_WINDOW);
  if (global.batidaAttempts[key].length >= BATIDA_RATE_MAX) return false;
  global.batidaAttempts[key].push(now);
  return true;
}

/** Middleware: extrai userId do token Supabase */
async function authenticateSupabaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token nao fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token invalido ou expirado' });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (err) {
    console.error('[Auth] Erro ao validar token:', err.message);
    res.status(401).json({ error: 'Erro ao validar autenticacao' });
  }
}

/**
 * POST /api/batidas/registrar
 * Valida e registra uma nova batida com regras server-side.
 */
router.post('/registrar', authenticateSupabaseToken, async (req, res) => {
  try {
    const { tipo, projetoId, latitude, longitude, observacao, precisaoGps } = req.body;
    const userId = req.userId;

    // 1. Valida tipo
    const tipoValidacao = batidaValidationService.validarTipoBatida(tipo);
    if (!tipoValidacao.valido) {
      return res.status(400).json({ error: tipoValidacao.erro });
    }

    // 2. Rate limiting
    if (!checkBatidaRateLimit(userId)) {
      return res.status(429).json({ error: 'Limite de batidas excedido. Aguarde antes de registrar novamente.' });
    }

    // 3. Obtem estado atual da jornada
    const diaISO = new Date().toISOString().split('T')[0];
    const estadoAtual = await batidaValidationService.obterEstadoAtualDoDia(userId, diaISO);

    // 4. Valida transicao
    const transicao = batidaValidationService.validarTransicao(estadoAtual.estado, tipo);
    if (!transicao.valido) {
      return res.status(409).json({ error: transicao.erro, estado: estadoAtual.estado });
    }

    // 5. Valida projeto se informado
    if (projetoId) {
      const projetoValidacao = await batidaValidationService.validarProjetoAtivo(projetoId);
      if (!projetoValidacao.valido) {
        return res.status(400).json({ error: projetoValidacao.erro });
      }

      // 6. Valida geocerca se projeto tem geocerca e coords foram enviadas
      if (latitude != null && longitude != null) {
        const geocercaResultado = batidaValidationService.validarGeocercaProjeto(projetoValidacao.projeto, latitude, longitude);
        if (!geocercaResultado.dentro) {
          return res.status(403).json({
            error: geocercaResultado.erro,
            fora_geocerca: true
          });
        }
      } else if (projetoValidacao.projeto?.geocerca_latitude != null) {
        // Projeto tem geocerca mas usuario nao enviou coords
        return res.status(400).json({ error: 'Localizacao obrigatoria para projetos com geocerca. Permita o acesso a sua localizacao.' });
      }
    }

    // 7. Busca info do user para preencher campos
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('superior_empresa_id, empresa_id')
      .eq('id', userId)
      .maybeSingle();

    const superiorEmpresaId = profile?.superior_empresa_id || null;
    const empresaId = profile?.empresa_id || null;

    // 8. Monta registro de batida
    const batida = {
      user_id: userId,
      tipo,
      timestamp_servidor: new Date().toISOString(),
      timestamp_cliente: new Date().toISOString(), // mantem para compatibilidade
      latitude: latitude != null ? parseFloat(latitude) : null,
      longitude: longitude != null ? parseFloat(longitude) : null,
      precisao_gps: precisaoGps != null ? parseFloat(precisaoGps) : null,
      foto_url: null,
      dispositivo: 'server', // server-signed, nao client
      retroativo: false,
      observacao: observacao || null,
      projeto_id: projetoId || null,
      empresa_id: empresaId,
      superior_empresa_id: superiorEmpresaId,
      fora_geocerca: false
    };

    // 9. Insert via service_role
    const { data: batidaInserida, error: insertError } = await batidaValidationService.supabase
      .from('batidas')
      .insert([batida])
      .select()
      .single();

    if (insertError) {
      console.error('[Batida] Erro ao inserir:', insertError);
      return res.status(500).json({ error: 'Erro ao registrar batida' });
    }

    // 10. Atualiza jornada
    try {
      await atualizarJornada(userId, superiorEmpresaId, projetoId, empresaId);
    } catch (err) {
      console.error('[Batida] Erro ao atualizar jornada:', err.message);
      // Nao falha a batida por erro na jornada
    }

    // 11. Retorna novo estado
    const novoEstado = await batidaValidationService.obterEstadoAtualDoDia(userId, diaISO);

    res.json({
      success: true,
      batida: batidaInserida,
      estado: novoEstado
    });
  } catch (err) {
    console.error('[Batida] Erro inesperado:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/batidas/estado
 * Retorna estado atual da jornada do usuario autenticado.
 */
router.get('/estado', authenticateSupabaseToken, async (req, res) => {
  try {
    const { dia } = req.query;
    const userId = req.userId;
    const diaISO = dia || new Date().toISOString().split('T')[0];

    const estado = await batidaValidationService.obterEstadoAtualDoDia(userId, diaISO);
    const { data: batidasDoDia } = await batidaValidationService.supabase
      .from('batidas')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp_servidor', `${diaISO}T00:00:00Z`)
      .lt('timestamp_servidor', `${diaISO}T23:59:59.999Z`)
      .order('timestamp_servidor', { ascending: true });

    res.json({
      estado,
      batidas: batidasDoDia || [],
      dia: diaISO
    });
  } catch (err) {
    console.error('[Batida Estado] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao consultar estado' });
  }
});

/**
 * Atualiza jornada do usuario (adaptado do BatidaService).
 * Usa service_role e roda server-side.
 */
async function atualizarJornada(userId, superiorEmpresaId, projetoId, empresaId) {
  const agoraIso = new Date().toISOString();
  const fuso = 'America/Sao_Paulo'; // default, pode ser refinado

  // Busca batidas em janela expandida (+- 2 dias)
  const centro = agoraIso.split('T')[0];
  const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloPeriodo(centro, -2, 2, fuso);

  const { data: batidasJanela, error: errBatidas } = await batidaValidationService.supabase
    .from('batidas')
    .select('*')
    .eq('user_id', userId)
    .gte('timestamp_servidor', inicioUtcIso)
    .lt('timestamp_servidor', exclusivoFimUtcIso)
    .order('timestamp_servidor', { ascending: true });

  if (errBatidas || !batidasJanela?.length) return;

  const batidasOrdenadas = [...batidasJanela].sort(
    (a, b) => new Date(a.timestamp_servidor) - new Date(b.timestamp_servidor)
  );

  // Segmenta jornadas
  const segmentos = obterSegmentosJornada(batidasOrdenadas);

  // Agrupa por dia oficial
  const porDia = {};
  for (const segmento of segmentos) {
    const primeiroTs = segmento[0]?.timestamp_servidor;
    if (!primeiroTs) continue;
    const diaJornada = new Date(primeiroTs).toISOString().split('T')[0];
    if (!porDia[diaJornada]) porDia[diaJornada] = [];
    porDia[diaJornada].push(...segmento);
  }

  // Sort dias
  const diasOrdenados = Object.keys(porDia).sort();

  // Busca perfil para carga horaria
  const { data: profile } = await batidaValidationService.supabase
    .from('profiles')
    .select('carga_horaria, hora_entrada, hora_saida')
    .eq('id', userId)
    .single();

  const cargaHorariaSemanal = profile?.carga_horaria || 40;
  const jornadaDiariaMinutos = (cargaHorariaSemanal / 5) * 60;
  const horaEntradaPerfil = profile?.hora_entrada?.substring(0, 5) || null;
  const horaSaidaPerfil = profile?.hora_saida?.substring(0, 5) || null;
  const LIMITE_ATRASO_RAZOAVEL = jornadaDiariaMinutos;

  for (const dia of diasOrdenados) {
    const batidasDoDia = porDia[dia];
    if (!batidasDoDia?.length) continue;

    const totalTrabalhado = calcularTempoTrabalhado(batidasDoDia);
    const totalPausa = calcularTempoPausa(batidasDoDia);
    const estado = batidaValidationService.determinarEstadoJornada(batidasDoDia);
    const status = estado.estado === 'encerrada' ? 'fechada' : 'aberta';

    const horasExtras = totalTrabalhado > jornadaDiariaMinutos
      ? totalTrabalhado - jornadaDiariaMinutos : 0;

    let atrasoMinutos = 0;
    let saidaAntecipadaMinutos = 0;

    const primeiraEntrada = batidasDoDia.find(b => b.tipo === 'entrada');
    const ultimaSaida = [...batidasDoDia].reverse().find(b => b.tipo === 'saida');

    if (primeiraEntrada && horaEntradaPerfil) {
      const horaReal = new Date(primeiraEntrada.timestamp_servidor)
        .toISOString().substring(11, 16);
      atrasoMinutos = calcularAtrasoSimples(horaReal, horaEntradaPerfil);
      if (atrasoMinutos > LIMITE_ATRASO_RAZOAVEL) atrasoMinutos = 0;
    }

    if (ultimaSaida && horaSaidaPerfil) {
      const horaReal = new Date(ultimaSaida.timestamp_servidor)
        .toISOString().substring(11, 16);
      saidaAntecipadaMinutos = calcularSaidaAntecipadaSimples(horaReal, horaSaidaPerfil);
      if (saidaAntecipadaMinutos > LIMITE_ATRASO_RAZOAVEL) saidaAntecipadaMinutos = 0;
    }

    const { data: existente } = await batidaValidationService.supabase
      .from('jornadas')
      .select('id')
      .eq('user_id', userId)
      .eq('data', dia)
      .maybeSingle();

    const dadosJornada = {
      status,
      total_minutos_trabalhados: Math.floor(totalTrabalhado),
      total_minutos_pausa: Math.floor(totalPausa),
      horas_extras_minutos: Math.floor(horasExtras),
      atraso_minutos: atrasoMinutos,
      saida_antecipada_minutos: saidaAntecipadaMinutos,
      updated_at: new Date().toISOString()
    };

    if (existente) {
      await batidaValidationService.supabase
        .from('jornadas')
        .update(dadosJornada)
        .eq('id', existente.id);
    } else {
      await batidaValidationService.supabase
        .from('jornadas')
        .insert([{
          user_id: userId,
          data: dia,
          ...dadosJornada,
          projeto_id: projetoId || null,
          empresa_id: empresaId || null,
          superior_empresa_id: superiorEmpresaId || null
        }]);
    }
  }
}

function calcularTempoTrabalhado(batidas) {
  let totalMinutos = 0;
  let inicioTrabalho = null;
  for (const batida of batidas) {
    const timestamp = new Date(batida.timestamp_servidor);
    if (batida.tipo === 'entrada' || batida.tipo === 'retorno') {
      inicioTrabalho = timestamp;
    } else if ((batida.tipo === 'pausa' || batida.tipo === 'saida') && inicioTrabalho) {
      totalMinutos += (timestamp - inicioTrabalho) / (1000 * 60);
      inicioTrabalho = null;
    }
  }
  if (inicioTrabalho) {
    totalMinutos += (new Date() - inicioTrabalho) / (1000 * 60);
  }
  return totalMinutos;
}

function calcularTempoPausa(batidas) {
  let totalMinutos = 0;
  let inicioPausa = null;
  for (const batida of batidas) {
    const timestamp = new Date(batida.timestamp_servidor);
    if (batida.tipo === 'pausa') {
      inicioPausa = timestamp;
    } else if (batida.tipo === 'retorno' && inicioPausa) {
      totalMinutos += (timestamp - inicioPausa) / (1000 * 60);
      inicioPausa = null;
    }
  }
  if (inicioPausa) {
    totalMinutos += (new Date() - inicioPausa) / (1000 * 60);
  }
  return totalMinutos;
}

function obterSegmentosJornada(batidasOrdenadas) {
  const segmentos = [];
  let corrente = [];
  for (const b of batidasOrdenadas) {
    if (b.tipo === 'entrada') {
      if (corrente.length) segmentos.push(corrente);
      corrente = [b];
    } else if (corrente.length > 0) {
      corrente.push(b);
      if (b.tipo === 'saida') {
        segmentos.push(corrente);
        corrente = [];
      }
    } else {
      corrente = [b];
    }
  }
  if (corrente.length) segmentos.push(corrente);
  return segmentos;
}

function obterIntervaloPeriodo(centroYmd, diasAntes, diasDepois, fuso) {
  const centro = new Date(centroYmd);
  const inicio = new Date(centro);
  inicio.setUTCDate(inicio.getUTCDate() - diasAntes);
  const fim = new Date(centro);
  fim.setUTCDate(fim.getUTCDate() + diasDepois + 1);
  return {
    inicioUtcIso: inicio.toISOString(),
    exclusivoFimUtcIso: fim.toISOString()
  };
}

function calcularAtrasoSimples(horaReal, horaEsperada) {
  const [rh, rm] = horaReal.split(':').map(Number);
  const [eh, em] = horaEsperada.split(':').map(Number);
  const diffMin = (rh * 60 + rm) - (eh * 60 + em);
  return Math.max(0, diffMin);
}

function calcularSaidaAntecipadaSimples(horaReal, horaEsperada) {
  const [rh, rm] = horaReal.split(':').map(Number);
  const [eh, em] = horaEsperada.split(':').map(Number);
  const diffMin = (eh * 60 + em) - (rh * 60 + rm);
  return Math.max(0, diffMin);
}

export default router;
