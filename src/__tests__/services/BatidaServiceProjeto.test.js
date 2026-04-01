import { describe, it, expect } from 'vitest';
import BatidaService from '../../services/BatidaService';

describe('BatidaService verificarSeBatidaPermiteAssociarProjeto', () => {
  const agora = Date.now();
  const dentroDoPrazo = new Date(agora - 5 * 24 * 60 * 60 * 1000).toISOString();
  const foraDoPrazo = new Date(agora - 40 * 24 * 60 * 60 * 1000).toISOString();

  it('permite quando projeto_id nulo e data recente', () => {
    expect(
      BatidaService.verificarSeBatidaPermiteAssociarProjeto({
        projeto_id: null,
        timestamp_servidor: dentroDoPrazo
      })
    ).toBe(true);
  });

  it('nega quando já tem projeto', () => {
    expect(
      BatidaService.verificarSeBatidaPermiteAssociarProjeto({
        projeto_id: 'uuid',
        timestamp_servidor: dentroDoPrazo
      })
    ).toBe(false);
  });

  it('nega quando batida muito antiga', () => {
    expect(
      BatidaService.verificarSeBatidaPermiteAssociarProjeto({
        projeto_id: null,
        timestamp_servidor: foraDoPrazo
      })
    ).toBe(false);
  });
});

describe('BatidaService obterSegmentosJornadaDoDia', () => {
  it('agrupa entrada até saída no mesmo segmento', () => {
    const b = (id, tipo) => ({ id, tipo, projeto_id: null, timestamp_servidor: '2025-01-01T08:00:00Z' });
    const lista = [b('e1', 'entrada'), b('p1', 'pausa'), b('r1', 'retorno'), b('s1', 'saida')];
    const segs = BatidaService.obterSegmentosJornadaDoDia(lista);
    expect(segs).toHaveLength(1);
    expect(segs[0].map(x => x.id)).toEqual(['e1', 'p1', 'r1', 's1']);
  });

  it('separa dois ciclos entrada-saída no mesmo dia', () => {
    const b = (id, tipo) => ({ id, tipo });
    const lista = [
      b('e1', 'entrada'),
      b('s1', 'saida'),
      b('e2', 'entrada'),
      b('s2', 'saida')
    ];
    const segs = BatidaService.obterSegmentosJornadaDoDia(lista);
    expect(segs).toHaveLength(2);
    expect(segs[0].map(x => x.id)).toEqual(['e1', 's1']);
    expect(segs[1].map(x => x.id)).toEqual(['e2', 's2']);
  });

  it('obterSegmentoQueContemBatida retorna o bloco correto', () => {
    const b = (id, tipo) => ({ id, tipo });
    const lista = [b('e1', 'entrada'), b('p1', 'pausa'), b('s1', 'saida')];
    const seg = BatidaService.obterSegmentoQueContemBatida(lista, 'p1');
    expect(seg?.map(x => x.id)).toEqual(['e1', 'p1', 's1']);
  });

  it('entrada sem saída e nova entrada gera dois segmentos', () => {
    const b = (id, tipo) => ({ id, tipo });
    const lista = [b('e1', 'entrada'), b('e2', 'entrada')];
    const segs = BatidaService.obterSegmentosJornadaDoDia(lista);
    expect(segs).toHaveLength(2);
    expect(segs[0].map(x => x.id)).toEqual(['e1']);
    expect(segs[1].map(x => x.id)).toEqual(['e2']);
  });
});

describe('BatidaService agruparBatidasPorDiaOficialJornada', () => {
  it('atribui toda jornada noturna ao dia civil da primeira batida (entrada)', () => {
    const linhas = [
      {
        id: 'e1',
        tipo: 'entrada',
        timestamp_servidor: '2026-03-30T23:00:00.000Z',
        projeto_id: null
      },
      {
        id: 's1',
        tipo: 'saida',
        timestamp_servidor: '2026-03-31T08:00:00.000Z',
        projeto_id: null
      }
    ];
    const porDia = BatidaService.agruparBatidasPorDiaOficialJornada(linhas, 'America/Sao_Paulo');
    expect(Object.keys(porDia).sort()).toEqual(['2026-03-30']);
    expect(porDia['2026-03-30'].map(b => b.id)).toEqual(['e1', 's1']);
  });
});

describe('BatidaService obterDiaJornadaIsoDoSegmento', () => {
  it('retorna YYYY-MM-DD da primeira batida do segmento', () => {
    const seg = [
      { tipo: 'entrada', timestamp_servidor: '2026-04-01T02:50:00.000Z' },
      { tipo: 'saida', timestamp_servidor: '2026-04-01T03:10:00.000Z' }
    ];
    expect(BatidaService.obterDiaJornadaIsoDoSegmento(seg, 'America/Sao_Paulo')).toBe('2026-03-31');
  });
});

describe('BatidaService verificarSeSegmentoJornadaEstaAberto', () => {
  it('true quando não há saída no segmento', () => {
    const seg = [{ tipo: 'entrada' }, { tipo: 'pausa' }];
    expect(BatidaService.verificarSeSegmentoJornadaEstaAberto(seg)).toBe(true);
  });

  it('false quando há saída', () => {
    const seg = [{ tipo: 'entrada' }, { tipo: 'saida' }];
    expect(BatidaService.verificarSeSegmentoJornadaEstaAberto(seg)).toBe(false);
  });

  it('false para segmento vazio', () => {
    expect(BatidaService.verificarSeSegmentoJornadaEstaAberto([])).toBe(false);
  });
});

describe('BatidaService obterIntervaloMesCorrenteFormatado', () => {
  it('retorna primeiro e último dia do mês', () => {
    const intervalo = BatidaService.obterIntervaloMesCorrenteFormatado();
    expect(intervalo.dataInicio).toMatch(/^\d{4}-\d{2}-01$/);
    expect(intervalo.dataFim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(intervalo.dataInicio.slice(0, 7)).toBe(intervalo.dataFim.slice(0, 7));
  });
});
