import { describe, it, expect } from 'vitest';
import CalculoTrabalhistaService from '../../services/CalculoTrabalhistaService';

describe('CalculoTrabalhistaService', () => {
  // ── horarioParaMinutos ──
  describe('horarioParaMinutos', () => {
    it('converte "09:00" para 540', () => {
      expect(CalculoTrabalhistaService.horarioParaMinutos('09:00')).toBe(540);
    });

    it('converte "18:30" para 1110', () => {
      expect(CalculoTrabalhistaService.horarioParaMinutos('18:30')).toBe(1110);
    });

    it('converte "00:00" (meia-noite) para 0', () => {
      expect(CalculoTrabalhistaService.horarioParaMinutos('00:00')).toBe(0);
    });

    it('retorna 0 para valor nulo', () => {
      expect(CalculoTrabalhistaService.horarioParaMinutos(null)).toBe(0);
    });
  });

  // ── formatarMinutos ──
  describe('formatarMinutos', () => {
    it('formata 0 como "00:00"', () => {
      expect(CalculoTrabalhistaService.formatarMinutos(0)).toBe('00:00');
    });

    it('formata 90 como "01:30"', () => {
      expect(CalculoTrabalhistaService.formatarMinutos(90)).toBe('01:30');
    });

    it('formata 480 como "08:00"', () => {
      expect(CalculoTrabalhistaService.formatarMinutos(480)).toBe('08:00');
    });

    it('retorna "00:00" para valor negativo', () => {
      expect(CalculoTrabalhistaService.formatarMinutos(-10)).toBe('00:00');
    });

    it('retorna "00:00" para null', () => {
      expect(CalculoTrabalhistaService.formatarMinutos(null)).toBe('00:00');
    });
  });

  // ── formatarSaldoMinutos ──
  describe('formatarSaldoMinutos', () => {
    it('mostra sinal positivo para saldo positivo', () => {
      expect(CalculoTrabalhistaService.formatarSaldoMinutos(90)).toBe('+01:30');
    });

    it('mostra sinal negativo para saldo negativo', () => {
      expect(CalculoTrabalhistaService.formatarSaldoMinutos(-45)).toBe('-00:45');
    });

    it('mostra +00:00 para saldo zero', () => {
      expect(CalculoTrabalhistaService.formatarSaldoMinutos(0)).toBe('+00:00');
    });
  });

  // ── calcularHorasExtras ──
  describe('calcularHorasExtras', () => {
    it('retorna 0 quando trabalhado é menor que a jornada', () => {
      expect(CalculoTrabalhistaService.calcularHorasExtras(400, 480)).toBe(0);
    });

    it('retorna 0 quando trabalhado é exatamente a jornada', () => {
      expect(CalculoTrabalhistaService.calcularHorasExtras(480, 480)).toBe(0);
    });

    it('retorna minutos excedentes quando trabalhado supera a jornada', () => {
      expect(CalculoTrabalhistaService.calcularHorasExtras(540, 480)).toBe(60);
    });

    it('usa jornada padrão de 480min (8h) se não informada', () => {
      expect(CalculoTrabalhistaService.calcularHorasExtras(500)).toBe(20);
    });
  });

  // ── calcularAtraso ──
  describe('calcularAtraso', () => {
    it('retorna 0 se a entrada real está dentro da tolerância', () => {
      expect(CalculoTrabalhistaService.calcularAtraso('09:05', '09:00', 10)).toBe(0);
    });

    it('retorna 0 se a entrada é no horário exato', () => {
      expect(CalculoTrabalhistaService.calcularAtraso('09:00', '09:00')).toBe(0);
    });

    it('retorna minutos de atraso quando ultrapassa tolerância', () => {
      expect(CalculoTrabalhistaService.calcularAtraso('09:15', '09:00', 10)).toBe(15);
    });

    it('retorna 0 se parâmetros são nulos', () => {
      expect(CalculoTrabalhistaService.calcularAtraso(null, '09:00')).toBe(0);
      expect(CalculoTrabalhistaService.calcularAtraso('09:00', null)).toBe(0);
    });

    it('usa tolerância padrão de 10min', () => {
      expect(CalculoTrabalhistaService.calcularAtraso('09:10', '09:00')).toBe(0);
      expect(CalculoTrabalhistaService.calcularAtraso('09:11', '09:00')).toBe(11);
    });

    it('identifica atraso grande corretamente', () => {
      expect(CalculoTrabalhistaService.calcularAtraso('10:00', '09:00', 10)).toBe(60);
    });
  });

  // ── calcularSaidaAntecipada ──
  describe('calcularSaidaAntecipada', () => {
    it('retorna 0 se saída é no horário esperado', () => {
      expect(CalculoTrabalhistaService.calcularSaidaAntecipada('18:00', '18:00')).toBe(0);
    });

    it('retorna 0 se saída está dentro da tolerância', () => {
      expect(CalculoTrabalhistaService.calcularSaidaAntecipada('17:55', '18:00', 10)).toBe(0);
    });

    it('retorna minutos quando saída antecipada ultrapassa tolerância', () => {
      expect(CalculoTrabalhistaService.calcularSaidaAntecipada('17:30', '18:00', 10)).toBe(30);
    });

    it('retorna 0 se parâmetros são nulos', () => {
      expect(CalculoTrabalhistaService.calcularSaidaAntecipada(null, '18:00')).toBe(0);
    });
  });

  // ── verificarInterjornada ──
  describe('verificarInterjornada', () => {
    it('valida interjornada com descanso suficiente (>= 11h)', () => {
      const saida = '2026-03-24T18:00:00';
      const entrada = '2026-03-25T09:00:00';
      const resultado = CalculoTrabalhistaService.verificarInterjornada(saida, entrada);
      expect(resultado.valida).toBe(true);
      expect(resultado.horasDescanso).toBe(15);
    });

    it('invalida interjornada com descanso insuficiente (< 11h)', () => {
      const saida = '2026-03-24T23:00:00';
      const entrada = '2026-03-25T06:00:00';
      const resultado = CalculoTrabalhistaService.verificarInterjornada(saida, entrada);
      expect(resultado.valida).toBe(false);
      expect(resultado.horasDescanso).toBe(7);
    });

    it('retorna válida para valores nulos', () => {
      const resultado = CalculoTrabalhistaService.verificarInterjornada(null, '2026-03-25T09:00:00');
      expect(resultado.valida).toBe(true);
      expect(resultado.horasDescanso).toBeNull();
    });

    it('interjornada exatamente 11h é válida', () => {
      const saida = '2026-03-24T18:00:00';
      const entrada = '2026-03-25T05:00:00';
      const resultado = CalculoTrabalhistaService.verificarInterjornada(saida, entrada);
      expect(resultado.valida).toBe(true);
      expect(resultado.horasDescanso).toBe(11);
      expect(resultado.minimoNecessario).toBe(11);
    });
  });

  // ── calcularBancoDeHoras ──
  describe('calcularBancoDeHoras', () => {
    it('calcula saldo positivo quando trabalha mais que o padrão', () => {
      const jornadas = [
        { total_minutos_trabalhados: 500, status: 'fechada' },
        { total_minutos_trabalhados: 510, status: 'fechada' },
      ];
      const resultado = CalculoTrabalhistaService.calcularBancoDeHoras(jornadas, 480);
      expect(resultado.saldoMinutos).toBe(50);
      expect(resultado.positivo).toBe(true);
    });

    it('calcula saldo negativo quando trabalha menos que o padrão', () => {
      const jornadas = [
        { total_minutos_trabalhados: 400, status: 'fechada' },
        { total_minutos_trabalhados: 450, status: 'fechada' },
      ];
      const resultado = CalculoTrabalhistaService.calcularBancoDeHoras(jornadas, 480);
      expect(resultado.saldoMinutos).toBe(-110);
      expect(resultado.positivo).toBe(false);
    });

    it('ignora jornadas rejeitadas', () => {
      const jornadas = [
        { total_minutos_trabalhados: 500, status: 'fechada' },
        { total_minutos_trabalhados: 200, status: 'rejeitada' },
      ];
      const resultado = CalculoTrabalhistaService.calcularBancoDeHoras(jornadas, 480);
      expect(resultado.saldoMinutos).toBe(20);
    });

    it('retorna zero para lista vazia', () => {
      const resultado = CalculoTrabalhistaService.calcularBancoDeHoras([], 480);
      expect(resultado.saldoMinutos).toBe(0);
    });
  });

  // ── calcularResumoMensal ──
  describe('calcularResumoMensal', () => {
    const jornadasDoMes = [
      { total_minutos_trabalhados: 500, status: 'fechada', atraso_minutos: 15 },
      { total_minutos_trabalhados: 480, status: 'fechada', atraso_minutos: 0 },
      { total_minutos_trabalhados: 0, status: 'fechada', atraso_minutos: 0 },
      { total_minutos_trabalhados: 490, status: 'aprovada', atraso_minutos: 5 },
      { total_minutos_trabalhados: 300, status: 'rejeitada', atraso_minutos: 0 },
    ];

    it('conta dias trabalhados corretamente (exclui rejeitadas e sem minutos)', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.diasTrabalhados).toBe(3);
    });

    it('acumula total de minutos trabalhados (exclui rejeitadas)', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.totalTrabalhadoMinutos).toBe(1470);
    });

    it('calcula horas extras por dia e soma', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.totalExtrasMinutos).toBe(30);
    });

    it('conta dias com atraso', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.diasComAtraso).toBe(2);
    });

    it('conta dias de falta (status != aberta e sem minutos trabalhados)', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.diasFalta).toBe(1);
    });

    it('calcula média diária', () => {
      const resumo = CalculoTrabalhistaService.calcularResumoMensal(jornadasDoMes, { carga_horaria: 8 });
      expect(resumo.mediaDiariaMinutos).toBe(490);
    });
  });

  // ── calcularAdicionalNoturno ──
  describe('calcularAdicionalNoturno', () => {
    it('retorna 0 para lista vazia', () => {
      expect(CalculoTrabalhistaService.calcularAdicionalNoturno([])).toBe(0);
    });

    it('retorna 0 para null', () => {
      expect(CalculoTrabalhistaService.calcularAdicionalNoturno(null)).toBe(0);
    });

    it('calcula minutos noturnos ficticios (fator 52.5min) para 22h-23h', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T22:00:00' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T23:00:00' },
      ];
      // 60min reais / 0.875 = ~68.57 -> 69 ficticios
      const resultado = CalculoTrabalhistaService.calcularAdicionalNoturno(batidas);
      expect(Math.round(resultado)).toBe(69);
    });

    it('calcula zero para trabalho inteiramente diurno', () => {
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T18:00:00' },
      ];
      const resultado = CalculoTrabalhistaService.calcularAdicionalNoturno(batidas);
      expect(resultado).toBe(0);
    });
  });

  // ── segmentarHorasExtrasPorPercentual ──
  describe('segmentarHorasExtrasPorPercentual', () => {
    it('retorna zeros para extras negativos', () => {
      const seg = CalculoTrabalhistaService.segmentarHorasExtrasPorPercentual(0, '2026-04-06');
      expect(seg.minutos50).toBe(0);
      expect(seg.minutos100).toBe(0);
    });

    it('segmenta até 120min a 50% em dia útil (segunda)', () => {
      const seg = CalculoTrabalhistaService.segmentarHorasExtrasPorPercentual(90, '2026-04-06'); // segunda
      expect(seg.minutos50).toBe(90);
      expect(seg.minutos100).toBe(0);
      expect(seg.valor50Minutos).toBe(Math.round(90 * 1.5));
    });

    it('segmenta excedente de 2h a 100% em dia útil', () => {
      const seg = CalculoTrabalhistaService.segmentarHorasExtrasPorPercentual(180, '2026-04-06'); // 3h extra, seg
      expect(seg.minutos50).toBe(120);
      expect(seg.minutos100).toBe(60);
      expect(seg.valor50Minutos).toBe(Math.round(120 * 1.5));
      expect(seg.valor100Minutos).toBe(Math.round(60 * 2));
    });

    it('domingo vai tudo a 100%', () => {
      const seg = CalculoTrabalhistaService.segmentarHorasExtrasPorPercentual(60, '2026-04-05'); // dom
      expect(seg.minutos50).toBe(0);
      expect(seg.minutos100).toBe(60);
    });

    it('feriado vai tudo a 100%', () => {
      const seg = CalculoTrabalhistaService.segmentarHorasExtrasPorPercentual(60, '2026-04-06', true);
      expect(seg.minutos50).toBe(0);
      expect(seg.minutos100).toBe(60);
    });
  });

  // ── calcularBancoDeHorasExpiracao ──
  describe('calcularBancoDeHorasExpiracao', () => {
    it('marca entradas recentes como ativas', () => {
      const entradas = [
        { dataCriacao: '2026-01-15', saldoMinutos: 60 }
      ];
      const resultado = CalculoTrabalhistaService.calcularBancoDeHorasExpiracao(entradas, '2026-02-15');
      expect(resultado.saldoValido).toBe(60);
      expect(resultado.saldoExpirado).toBe(0);
    });

    it('marca entradas antigas como expiradas', () => {
      const entradas = [
        { dataCriacao: '2025-06-01', saldoMinutos: 120 }
      ];
      const resultado = CalculoTrabalhistaService.calcularBancoDeHorasExpiracao(entradas, '2026-02-15');
      expect(resultado.saldoExpirado).toBe(120);
      expect(resultado.saldoValido).toBe(0);
    });

    it('lista vazia retorna zeros', () => {
      const resultado = CalculoTrabalhistaService.calcularBancoDeHorasExpiracao([]);
      expect(resultado.saldoValido).toBe(0);
      expect(resultado.saldoExpirado).toBe(0);
    });
  });

  // ── analisarJornada ──
  describe('analisarJornada', () => {
    it('identifica jornada sem irregularidades', () => {
      const jornada = { total_minutos_trabalhados: 480 };
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T18:00:00' },
      ];
      const config = { carga_horaria: 8, hora_entrada_padrao: '09:00', hora_saida_padrao: '18:00' };
      const analise = CalculoTrabalhistaService.analisarJornada(jornada, batidas, config);
      expect(analise.horasExtras).toBe(0);
      expect(analise.atrasoMinutos).toBe(0);
      expect(analise.irregularidades).toHaveLength(0);
    });

    it('identifica hora extra', () => {
      const jornada = { total_minutos_trabalhados: 540 };
      const batidas = [
        { tipo: 'entrada', timestamp_servidor: '2026-03-25T09:00:00' },
        { tipo: 'saida', timestamp_servidor: '2026-03-25T19:00:00' },
      ];
      const config = { carga_horaria: 8, hora_entrada_padrao: '09:00', hora_saida_padrao: '18:00' };
      const analise = CalculoTrabalhistaService.analisarJornada(jornada, batidas, config);
      expect(analise.horasExtras).toBe(60);
      expect(analise.irregularidades.some(i => i.tipo === 'hora_extra')).toBe(true);
    });

    it('calcula deficit quando trabalha menos que a jornada', () => {
      const jornada = { total_minutos_trabalhados: 400 };
      const analise = CalculoTrabalhistaService.analisarJornada(jornada, [], { carga_horaria: 8 });
      expect(analise.deficit).toBe(80);
      expect(analise.excedente).toBe(0);
    });
  });
});
