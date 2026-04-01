/**
 * Evento no window para analytics/telemetria (ex.: GTM, Plausible, Supabase log).
 * Detalhe: { nomeEvento, ...campos, ts }
 */
export function registrarMetricaProdutoBatidas(nomeEvento, detalhes = {}) {
  if (typeof window === 'undefined' || !window.dispatchEvent) return;
  try {
    window.dispatchEvent(
      new CustomEvent('yourtime_metrica_produto', {
        detail: { nomeEvento, ...detalhes, ts: Date.now() }
      })
    );
  } catch {
    /* noop */
  }
}
