import { fromZonedTime } from 'date-fns-tz';

/** Fuso padrão quando não há configuração persistida (alinhado a ConfigService). */
export const FUSO_PADRAO_IANA = 'America/Sao_Paulo';

/**
 * Fuso do navegador ou padrão Brasil — apenas fallback quando não há usuário/config.
 */
export function obterFusoHorarioNavegadorOuPadrao() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || FUSO_PADRAO_IANA;
  } catch {
    return FUSO_PADRAO_IANA;
  }
}

/**
 * Próximo dia civil (rótulo YYYY-MM-DD) sem ambiguidade de UTC.
 * @param {string} dataYmd
 * @returns {string}
 */
export function obterProximoDiaCalendarioYmd(dataYmd) {
  const partes = dataYmd.split('-').map(Number);
  const [ano, mes, dia] = partes;
  const u = new Date(Date.UTC(ano, mes - 1, dia));
  u.setUTCDate(u.getUTCDate() + 1);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Dia civil anterior (rótulo YYYY-MM-DD), espelhando {@link obterProximoDiaCalendarioYmd}.
 * @param {string} dataYmd
 * @returns {string}
 */
export function obterDiaAnteriorCalendarioYmd(dataYmd) {
  const partes = dataYmd.split('-').map(Number);
  const [ano, mes, dia] = partes;
  const u = new Date(Date.UTC(ano, mes - 1, dia));
  u.setUTCDate(u.getUTCDate() - 1);
  return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Data de calendário (YYYY-MM-DD) do instante no fuso IANA (único util para isso no app).
 */
export function obterDataCalendarioIsoNoFuso(instante, fusoIANA) {
  const d = instante instanceof Date ? instante : new Date(instante);
  if (Number.isNaN(d.getTime())) return '';
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoIANA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formato.format(d);
}

/**
 * Dia civil no fuso em que cai um timestamp armazenado em UTC.
 */
export function obterDataCalendarioIsoDoTimestampUtc(timestampIso, fusoIANA) {
  if (!timestampIso) return '';
  return obterDataCalendarioIsoNoFuso(new Date(timestampIso), fusoIANA);
}

/**
 * Intervalo UTC semiaberto [início, próximo_dia_meia_noite) para consultas — evita 23:59:59.999.
 * @returns {{ inicioUtcIso: string, exclusivoFimUtcIso: string }}
 */
export function obterIntervaloUtcSemiabertoParaDiaCalendario(dataYmd, fusoIANA) {
  const inicioUtc = fromZonedTime(`${dataYmd}T00:00:00.000`, fusoIANA);
  const proximoDiaYmd = obterProximoDiaCalendarioYmd(dataYmd);
  const exclusivoFimUtc = fromZonedTime(`${proximoDiaYmd}T00:00:00.000`, fusoIANA);
  return {
    inicioUtcIso: inicioUtc.toISOString(),
    exclusivoFimUtcIso: exclusivoFimUtc.toISOString()
  };
}

/**
 * Intervalo UTC semiaberto do primeiro ao último dia civil (inclusivos) em um único fuso.
 * dataInicioYmd e dataFimYmd são YYYY-MM-DD.
 */
export function obterIntervaloUtcSemiabertoParaPeriodoCalendario(dataInicioYmd, dataFimYmd, fusoIANA) {
  const { inicioUtcIso } = obterIntervaloUtcSemiabertoParaDiaCalendario(dataInicioYmd, fusoIANA);
  const diaAposFimYmd = obterProximoDiaCalendarioYmd(dataFimYmd);
  const exclusivoFimUtc = fromZonedTime(`${diaAposFimYmd}T00:00:00.000`, fusoIANA);
  return {
    inicioUtcIso,
    exclusivoFimUtcIso: exclusivoFimUtc.toISOString()
  };
}
