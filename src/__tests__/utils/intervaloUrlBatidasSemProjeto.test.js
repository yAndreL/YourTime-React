import { describe, it, expect } from 'vitest';
import {
  extrairIntervaloCustomDaUrl,
  montarCaminhoAssociacaoBatidasComPeriodo
} from '../../utils/intervaloUrlBatidasSemProjeto';

describe('extrairIntervaloCustomDaUrl', () => {
  it('retorna intervalo quando datas válidas e inicio <= fim', () => {
    const p = new URLSearchParams('dataInicio=2025-03-01&dataFim=2025-03-31');
    expect(extrairIntervaloCustomDaUrl(p)).toEqual({ dataInicio: '2025-03-01', dataFim: '2025-03-31' });
  });

  it('retorna null quando inicio > fim', () => {
    const p = new URLSearchParams('dataInicio=2025-04-01&dataFim=2025-03-01');
    expect(extrairIntervaloCustomDaUrl(p)).toBeNull();
  });

  it('retorna null quando formato inválido', () => {
    const p = new URLSearchParams('dataInicio=2025-1-01&dataFim=2025-03-01');
    expect(extrairIntervaloCustomDaUrl(p)).toBeNull();
  });
});

describe('montarCaminhoAssociacaoBatidasComPeriodo', () => {
  it('monta query com encode', () => {
    expect(montarCaminhoAssociacaoBatidasComPeriodo('2025-01-01', '2025-01-31')).toBe(
      '/batidas-sem-projeto?dataInicio=2025-01-01&dataFim=2025-01-31'
    );
  });
});
