import { describe, it, expect } from 'vitest';
import AusenciaService from '../../services/AusenciaService';

describe('AusenciaService — funções puras', () => {
  // ── getTiposAusencia ──
  describe('getTiposAusencia', () => {
    it('retorna objeto com todos os 10 tipos', () => {
      const tipos = AusenciaService.getTiposAusencia();
      expect(Object.keys(tipos)).toHaveLength(10);
    });

    it('contém tipo "atestado_medico" com requerAnexo true', () => {
      const tipos = AusenciaService.getTiposAusencia();
      expect(tipos.atestado_medico).toBeDefined();
      expect(tipos.atestado_medico.requerAnexo).toBe(true);
    });

    it('contém tipo "ferias" com requerAnexo false', () => {
      const tipos = AusenciaService.getTiposAusencia();
      expect(tipos.ferias).toBeDefined();
      expect(tipos.ferias.requerAnexo).toBe(false);
    });

    it('cada tipo tem label e requerAnexo', () => {
      const tipos = AusenciaService.getTiposAusencia();
      for (const [, config] of Object.entries(tipos)) {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('requerAnexo');
        expect(typeof config.label).toBe('string');
        expect(typeof config.requerAnexo).toBe('boolean');
      }
    });

    it('licenças especiais requerem anexo', () => {
      const tipos = AusenciaService.getTiposAusencia();
      expect(tipos.licenca_maternidade.requerAnexo).toBe(true);
      expect(tipos.licenca_paternidade.requerAnexo).toBe(true);
      expect(tipos.licenca_casamento.requerAnexo).toBe(true);
      expect(tipos.licenca_obito.requerAnexo).toBe(true);
    });
  });

  // ── calcularDiasAusencia ──
  describe('calcularDiasAusencia', () => {
    it('calcula 1 dia útil para mesma data (dia de semana)', () => {
      // 25/03/2026 = quarta-feira
      expect(AusenciaService.calcularDiasAusencia('2026-03-25', '2026-03-25')).toBe(1);
    });

    it('calcula 5 dias para uma semana completa (seg-sex)', () => {
      // 23/03/2026 = segunda, 27/03/2026 = sexta
      expect(AusenciaService.calcularDiasAusencia('2026-03-23', '2026-03-27')).toBe(5);
    });

    it('exclui finais de semana', () => {
      // 23/03/2026 (seg) a 29/03/2026 (dom) = 5 úteis
      expect(AusenciaService.calcularDiasAusencia('2026-03-23', '2026-03-29')).toBe(5);
    });

    it('retorna 0 para sábado a domingo', () => {
      // 28/03/2026 = sábado, 29/03/2026 = domingo
      expect(AusenciaService.calcularDiasAusencia('2026-03-28', '2026-03-29')).toBe(0);
    });

    it('calcula 10 dias para duas semanas completas', () => {
      // 23/03/2026 (seg) a 03/04/2026 (sex)
      expect(AusenciaService.calcularDiasAusencia('2026-03-23', '2026-04-03')).toBe(10);
    });

    it('funciona para período de um mês', () => {
      // março 2026: 23 dias úteis (01/03 = domingo)
      const dias = AusenciaService.calcularDiasAusencia('2026-03-01', '2026-03-31');
      expect(dias).toBe(22); // março 2026 tem 22 dias úteis
    });

    it('retorna 0 para sábado isolado', () => {
      // 28/03/2026 = sábado
      expect(AusenciaService.calcularDiasAusencia('2026-03-28', '2026-03-28')).toBe(0);
    });
  });
});
