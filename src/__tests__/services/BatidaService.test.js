import { describe, it, expect, vi, beforeEach } from 'vitest';
import BatidaService from '../../services/BatidaService';

describe('BatidaService — funções puras', () => {
  // ── determinarEstadoJornada ──
  describe('determinarEstadoJornada', () => {
    it('retorna "nao_iniciada" para lista vazia', () => {
      const resultado = BatidaService.determinarEstadoJornada([]);
      expect(resultado.estado).toBe('nao_iniciada');
      expect(resultado.proximaBatida).toBe('entrada');
    });

    it('retorna "nao_iniciada" para null', () => {
      const resultado = BatidaService.determinarEstadoJornada(null);
      expect(resultado.estado).toBe('nao_iniciada');
      expect(resultado.proximaBatida).toBe('entrada');
    });

    it('retorna "trabalhando" após entrada', () => {
      const batidas = [{ tipo: 'entrada' }];
      const resultado = BatidaService.determinarEstadoJornada(batidas);
      expect(resultado.estado).toBe('trabalhando');
      expect(resultado.proximaBatida).toBe('pausa');
    });

    it('retorna "em_pausa" após pausa', () => {
      const batidas = [{ tipo: 'entrada' }, { tipo: 'pausa' }];
      const resultado = BatidaService.determinarEstadoJornada(batidas);
      expect(resultado.estado).toBe('em_pausa');
      expect(resultado.proximaBatida).toBe('retorno');
    });

    it('retorna "trabalhando" após retorno', () => {
      const batidas = [{ tipo: 'entrada' }, { tipo: 'pausa' }, { tipo: 'retorno' }];
      const resultado = BatidaService.determinarEstadoJornada(batidas);
      expect(resultado.estado).toBe('trabalhando');
      expect(resultado.proximaBatida).toBe('pausa');
    });

    it('retorna "encerrada" após saída', () => {
      const batidas = [
        { tipo: 'entrada' },
        { tipo: 'pausa' },
        { tipo: 'retorno' },
        { tipo: 'saida' },
      ];
      const resultado = BatidaService.determinarEstadoJornada(batidas);
      expect(resultado.estado).toBe('encerrada');
      expect(resultado.proximaBatida).toBeNull();
    });
  });

  // ── calcularTempoTrabalhado ──
  describe('calcularTempoTrabalhado', () => {
    it('retorna 0 para lista vazia', () => {
      expect(BatidaService.calcularTempoTrabalhado([])).toBe(0);
    });

    it('retorna 0 para null', () => {
      expect(BatidaService.calcularTempoTrabalhado(null)).toBe(0);
    });

    it('calcula tempo de um período simples entrada-saída', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T17:00:00Z' },
      ];
      expect(BatidaService.calcularTempoTrabalhado(batidas)).toBe(480);
    });

    it('desconta período de pausa do total', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T12:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T13:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T18:00:00Z' },
      ];
      expect(BatidaService.calcularTempoTrabalhado(batidas)).toBe(480);
    });

    it('calcula corretamente com múltiplas pausas', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T08:00:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T10:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T10:15:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T12:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T13:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T17:00:00Z' },
      ];
      // 08-10 = 120, 10:15-12 = 105, 13-17 = 240 => total = 465
      expect(BatidaService.calcularTempoTrabalhado(batidas)).toBe(465);
    });
  });

  // ── calcularTempoPausa ──
  describe('calcularTempoPausa', () => {
    it('retorna 0 para lista vazia', () => {
      expect(BatidaService.calcularTempoPausa([])).toBe(0);
    });

    it('calcula pausa simples', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T12:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T13:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T18:00:00Z' },
      ];
      expect(BatidaService.calcularTempoPausa(batidas)).toBe(60);
    });

    it('soma múltiplas pausas', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T08:00:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T10:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T10:15:00Z' },
        { tipo: 'pausa', timestamp_servidor: '2026-03-25T12:00:00Z' },
        { tipo: 'retorno', timestamp_servidor: '2026-03-25T13:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T17:00:00Z' },
      ];
      // 10:00-10:15 = 15, 12:00-13:00 = 60 => 75
      expect(BatidaService.calcularTempoPausa(batidas)).toBe(75);
    });
  });

  // ── formatarMinutos ──
  describe('formatarMinutos', () => {
    it('formata 0 como "00:00"', () => {
      expect(BatidaService.formatarMinutos(0)).toBe('00:00');
    });

    it('formata 90 como "01:30"', () => {
      expect(BatidaService.formatarMinutos(90)).toBe('01:30');
    });

    it('retorna "00:00" para null', () => {
      expect(BatidaService.formatarMinutos(null)).toBe('00:00');
    });
  });

  // ── formatarMinutosDescritivo ──
  describe('formatarHorariosQuatroSlotsEstiloApontamento e horas string', () => {
    it('preenche quatro slots a partir de entradas e saídas', () => {
      const lista = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T12:00:00Z' },
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T13:00:00Z' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T18:00:00Z' }
      ];
      const h = BatidaService.formatarHorariosQuatroSlotsEstiloApontamento(lista);
      expect(h.entrada1).toMatch(/\d{2}:\d{2}/);
      expect(h.saida1).toMatch(/\d{2}:\d{2}/);
      expect(BatidaService.formatarHorasMinutosDecimalStringAPartirDasBatidas(lista)).toBe('08:00');
    });
  });

  describe('formatarMinutosDescritivo', () => {
    it('formata 0 como "0min"', () => {
      expect(BatidaService.formatarMinutosDescritivo(0)).toBe('0min');
    });

    it('formata 30 como "30min"', () => {
      expect(BatidaService.formatarMinutosDescritivo(30)).toBe('30min');
    });

    it('formata 60 como "1h"', () => {
      expect(BatidaService.formatarMinutosDescritivo(60)).toBe('1h');
    });

    it('formata 90 como "1h30min"', () => {
      expect(BatidaService.formatarMinutosDescritivo(90)).toBe('1h30min');
    });

    it('retorna "0min" para null', () => {
      expect(BatidaService.formatarMinutosDescritivo(null)).toBe('0min');
    });
  });

  describe('calcularHorasTrabalhadasPorProjetoAPartirDasBatidas', () => {
    it('agrupa batidas noturnas no dia civil de São Paulo (não no corte UTC)', () => {
      const linhas = [
        { projeto_id: 'p1', tipo: 'entrada', timestamp_servidor: '2026-03-31T02:00:00.000Z' },
        { projeto_id: 'p1', tipo: 'saida', timestamp_servidor: '2026-03-31T02:30:00.000Z' }
      ];
      const mapa = BatidaService.calcularHorasTrabalhadasPorProjetoAPartirDasBatidas(linhas, 'America/Sao_Paulo');
      expect(mapa.p1).toBeCloseTo(0.5, 5);
    });

    it('jornada que cruza meia-noite mantém horas inteiras no mesmo segmento (dia oficial da entrada)', () => {
      const linhas = [
        { projeto_id: 'p1', tipo: 'entrada', timestamp_servidor: '2026-03-30T23:00:00.000Z' },
        { projeto_id: 'p1', tipo: 'saida', timestamp_servidor: '2026-03-31T08:00:00.000Z' }
      ];
      const mapa = BatidaService.calcularHorasTrabalhadasPorProjetoAPartirDasBatidas(linhas, 'America/Sao_Paulo');
      expect(mapa.p1).toBeCloseTo(9, 5);
    });

    it('23:50 → 00:10 no mesmo fuso: bloco único creditado ao dia da primeira batida', () => {
      const linhas = [
        { projeto_id: 'p1', tipo: 'entrada', timestamp_servidor: '2026-04-01T02:50:00.000Z' },
        { projeto_id: 'p1', tipo: 'saida', timestamp_servidor: '2026-04-01T03:10:00.000Z' }
      ];
      const mapa = BatidaService.calcularHorasTrabalhadasPorProjetoAPartirDasBatidas(linhas, 'America/Sao_Paulo');
      expect(mapa.p1).toBeCloseTo(20 / 60, 5);
    });
  });
});

