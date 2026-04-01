import { describe, it, expect } from 'vitest';
import {
  obterDataCalendarioIsoDoTimestampUtc,
  obterIntervaloUtcSemiabertoParaDiaCalendario,
  obterProximoDiaCalendarioYmd,
  obterDiaAnteriorCalendarioYmd
} from '../../utils/fusoHorarioData';

describe('fusoHorarioData', () => {
  it('timestamp UTC à noite em São Paulo pertence ao dia civil anterior (BRT)', () => {
    expect(obterDataCalendarioIsoDoTimestampUtc('2026-03-31T02:00:00.000Z', 'America/Sao_Paulo')).toBe(
      '2026-03-30'
    );
  });

  it('intervalo semiaberto: início < fim exclusivo para um dia em São Paulo', () => {
    const { inicioUtcIso, exclusivoFimUtcIso } = obterIntervaloUtcSemiabertoParaDiaCalendario(
      '2026-03-30',
      'America/Sao_Paulo'
    );
    expect(new Date(inicioUtcIso).getTime()).toBeLessThan(new Date(exclusivoFimUtcIso).getTime());
    expect(exclusivoFimUtcIso.startsWith('2026-03-31T')).toBe(true);
  });

  it('obterProximoDiaCalendarioYmd incrementa o calendário gregoriano', () => {
    expect(obterProximoDiaCalendarioYmd('2026-03-30')).toBe('2026-03-31');
    expect(obterProximoDiaCalendarioYmd('2026-12-31')).toBe('2027-01-01');
  });

  it('obterDiaAnteriorCalendarioYmd decrementa o calendário gregoriano', () => {
    expect(obterDiaAnteriorCalendarioYmd('2026-03-31')).toBe('2026-03-30');
    expect(obterDiaAnteriorCalendarioYmd('2026-01-01')).toBe('2025-12-31');
  });
});
