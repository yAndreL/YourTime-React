const PREFIXO_CHAVE_AVISO_PROJETO = 'batida_aviso_projeto_';
const CHAVE_ULTIMO_PROJETO_BATIDA = 'ultimoProjetoBatida';

export function obterTextoDataLocalYYYYMMDD(referenciaData = new Date()) {
  const d = referenciaData instanceof Date ? referenciaData : new Date(referenciaData);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function montarChaveAvisoProjetoBatidaDoDia(textoData) {
  return `${PREFIXO_CHAVE_AVISO_PROJETO}${textoData}`;
}

export function verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia(textoData, armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!armazenamento) return false;
  return armazenamento.getItem(montarChaveAvisoProjetoBatidaDoDia(textoData)) === '1';
}

export function registrarAvisoProjetoBatidaExibidoNoDia(textoData, armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!armazenamento) return;
  armazenamento.setItem(montarChaveAvisoProjetoBatidaDoDia(textoData), '1');
}

export function obterSerialUltimoProjetoBatida(armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!armazenamento) return null;
  return armazenamento.getItem(CHAVE_ULTIMO_PROJETO_BATIDA);
}

export function salvarUltimoProjetoBatidaMinimoNoArmazenamento({ id, nome, empresa_id: empresaId } = {}, armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!armazenamento || !id) return;
  armazenamento.setItem(
    CHAVE_ULTIMO_PROJETO_BATIDA,
    JSON.stringify({
      id,
      nome: nome || '',
      empresa_id: empresaId ?? null
    })
  );
}

export function analisarUltimoProjetoBatidaDoArmazenamento(serial, armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  const texto = serial ?? obterSerialUltimoProjetoBatida(armazenamento);
  if (!texto) return null;
  try {
    const obj = JSON.parse(texto);
    if (obj && obj.id) return obj;
  } catch (e) {}
  return null;
}

export function verificarSeUsuarioPossuiProjetoSelecionado(armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!armazenamento) return false;
  const bruto = armazenamento.getItem('selectedProject');
  if (!bruto) return false;
  try {
    const p = JSON.parse(bruto);
    return !!(p && p.id);
  } catch (e) {
    return false;
  }
}
