/**
 * Utilitario de reconciliacao de fontes de ponto.
 *
 * Regra: batidas (ponto real) sao fonte primaria.
 * Agendamento (formulario) e fallback para dias sem batidas
 * (ex: usuario esqueceu de bater ponto — requer justificativa).
 *
 * Cada dia gera no maximo uma linha reconciliada.
 */

import { obterDataCalendarioIsoDoTimestampUtc, FUSO_PADRAO_IANA } from './fusoHorarioData';

/**
 * Agrupa array de agendamentos por chave YYYY-MM-DD.
 */
function agruparPorDiaAgendamentos(agendamentos) {
  const mapa = {};
  for (const a of (agendamentos || [])) {
    const chave = a.data; // ja vem como 'YYYY-MM-DD'
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(a);
  }
  return mapa;
}

/**
 * Agrupa batidas por dia calendario no fuso informado.
 */
function agruparPorDiaBatidas(batidas, fuso) {
  const mapa = {};
  for (const b of (batidas || [])) {
    if (!b.timestamp_servidor) continue;
    const chave = obterDataCalendarioIsoDoTimestampUtc(b.timestamp_servidor, fuso);
    if (!chave) continue;
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(b);
  }
  return mapa;
}

/**
 * Reconcilia agendamento e batidas para um mesmo dia.
 * Retorna uma unica entrada reconciliada ou null.
 *
 * - Se ha batidas → usa batidas como fonte primaria
 *   (se tambem ha formulario, fica como info complementar)
 * - Se so agendamento → usa formulario
 * - Se nenhum dos dois → null
 */
export function reconciliarDia(agendamentosDoDia, batidasDoDia) {
  const temBatidas = batidasDoDia && batidasDoDia.length > 0;
  const temFormulario = agendamentosDoDia && agendamentosDoDia.length > 0;

  if (temBatidas) {
    return {
      origem: 'batidas',
      batidas: batidasDoDia,
      agendamento: temFormulario ? agendamentosDoDia[0] : null,
      status: agendamentosDoDia?.[0]?.status || 'aberta'
    };
  }

  if (temFormulario) {
    return {
      origem: 'formulario',
      agendamento: agendamentosDoDia[0],
      batidas: null,
      status: agendamentosDoDia[0].status || 'pendente'
    };
  }

  return null;
}

/**
 * Reconcilia todos os dias de um periodo.
 * Retorna array de entradas reconciliadas ordenadas por data desc.
 *
 * @param {Array} agendamentos - registros da tabela agendamento
 * @param {Array} batidas - registros da tabela batidas
 * @param {string} fuso - fuso IANA
 * @returns {Array} entradas reconciliadas
 */
export function reconciliarPeriodo(agendamentos, batidas, fuso = FUSO_PADRAO_IANA) {
  const porDiaAgendamento = agruparPorDiaAgendamentos(agendamentos);
  const porDiaBatidas = agruparPorDiaBatidas(batidas, fuso);

  // Uniao de todas as chaves de dia
  const todasChaves = new Set([
    ...Object.keys(porDiaAgendamento),
    ...Object.keys(porDiaBatidas)
  ]);

  const reconciliados = [];
  for (const dia of todasChaves) {
    const resultado = reconciliarDia(porDiaAgendamento[dia] || [], porDiaBatidas[dia] || []);
    if (resultado) {
      resultado.data = dia;
      reconciliados.push(resultado);
    }
  }

  return reconciliados.sort((a, b) => b.data.localeCompare(a.data));
}
