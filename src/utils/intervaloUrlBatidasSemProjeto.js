const PADRAO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {URLSearchParams} parametrosBusca
 * @returns {{ dataInicio: string, dataFim: string } | null}
 */
export function extrairIntervaloCustomDaUrl(parametrosBusca) {
  const dataInicio = parametrosBusca.get('dataInicio');
  const dataFim = parametrosBusca.get('dataFim');
  if (!dataInicio || !dataFim) return null;
  if (!PADRAO_DATA_ISO.test(dataInicio) || !PADRAO_DATA_ISO.test(dataFim)) return null;
  if (dataInicio > dataFim) return null;
  return { dataInicio, dataFim };
}

export function montarCaminhoAssociacaoBatidasComPeriodo(dataInicio, dataFim) {
  const di = encodeURIComponent(dataInicio);
  const df = encodeURIComponent(dataFim);
  return `/batidas-sem-projeto?dataInicio=${di}&dataFim=${df}`;
}
