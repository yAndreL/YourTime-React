import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/supabase.js', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock('../../hooks/useLanguage.jsx', () => ({
  useLanguage: () => ({
    t: (key) => key,
  }),
}));

vi.mock('../../utils/dateUtils', () => ({
  getLocalDateString: () => '2026-03-25',
}));

describe('useTimeTracking — lógica de cálculo extraída', () => {

  const calculateDailyWorkedMinutes = (record) => {
    let totalMinutes = 0;
    if (record.entrada1 && record.saida1) {
      const entrada1 = new Date(`2000-01-01T${record.entrada1}`);
      const saida1 = new Date(`2000-01-01T${record.saida1}`);
      totalMinutes += (saida1 - entrada1) / (1000 * 60);
    }
    if (record.entrada2 && record.saida2) {
      const entrada2 = new Date(`2000-01-01T${record.entrada2}`);
      const saida2 = new Date(`2000-01-01T${record.saida2}`);
      totalMinutes += (saida2 - entrada2) / (1000 * 60);
    }
    return totalMinutes;
  };

  const calculateTimeBalance = (timeRecords) => {
    const registrosValidos = timeRecords.filter(record => record.status !== 'R');
    if (!registrosValidos.length) return '+00:00';
    let totalMinutes = 0;
    registrosValidos.forEach(record => {
      totalMinutes += calculateDailyWorkedMinutes(record);
    });
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const minutes = Math.abs(totalMinutes) % 60;
    const sign = totalMinutes >= 0 ? '+' : '-';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateTodayPendingHours = (timeRecords) => {
    const today = '2026-03-25';
    const pendingRecords = timeRecords.filter(record => record.data === today && record.status === 'P');
    if (!pendingRecords.length) return '00:00';
    const totalMinutes = pendingRecords.reduce((sum, record) => sum + calculateDailyWorkedMinutes(record), 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const verificarSeEstaTrabalhandoAgora = (timeRecords) => {
    const today = '2026-03-25';
    const registroHoje = timeRecords.find(r => r.data === today && r.status !== 'R');
    if (!registroHoje) return { isWorking: false, status: 'dashboard.noRecord' };
    if (registroHoje.entrada1 && !registroHoje.saida1) {
      return { isWorking: true, status: 'dashboard.working' };
    }
    if (registroHoje.saida1 && !registroHoje.entrada2) {
      return { isWorking: false, status: 'dashboard.onBreak' };
    }
    if (registroHoje.entrada2 && !registroHoje.saida2) {
      return { isWorking: true, status: 'dashboard.working' };
    }
    if (registroHoje.saida2) {
      return { isWorking: false, status: 'dashboard.dayCompleted' };
    }
    return { isWorking: false, status: 'dashboard.noRecord' };
  };

  // ── calculateDailyWorkedMinutes ──
  describe('calculateDailyWorkedMinutes', () => {
    it('calcula minutos do primeiro período', () => {
      const record = { entrada1: '09:00', saida1: '12:00' };
      expect(calculateDailyWorkedMinutes(record)).toBe(180);
    });

    it('calcula minutos de dois períodos', () => {
      const record = { entrada1: '09:00', saida1: '12:00', entrada2: '13:00', saida2: '18:00' };
      expect(calculateDailyWorkedMinutes(record)).toBe(480);
    });

    it('retorna 0 se não tem entrada/saída', () => {
      const record = {};
      expect(calculateDailyWorkedMinutes(record)).toBe(0);
    });

    it('calcula apenas primeiro período se segundo está incompleto', () => {
      const record = { entrada1: '09:00', saida1: '12:00', entrada2: '13:00' };
      expect(calculateDailyWorkedMinutes(record)).toBe(180);
    });
  });

  // ── calculateTimeBalance ──
  describe('calculateTimeBalance', () => {
    it('retorna "+00:00" para lista vazia', () => {
      expect(calculateTimeBalance([])).toBe('+00:00');
    });

    it('exclui registros rejeitados (status R)', () => {
      const records = [
        { entrada1: '09:00', saida1: '12:00', entrada2: '13:00', saida2: '18:00', status: 'A' },
        { entrada1: '09:00', saida1: '18:00', status: 'R' },
      ];
      const resultado = calculateTimeBalance(records);
      expect(resultado).toBe('+08:00');
    });

    it('soma múltiplos dias aprovados', () => {
      const records = [
        { entrada1: '09:00', saida1: '12:00', status: 'A' },
        { entrada1: '09:00', saida1: '12:00', status: 'P' },
      ];
      const resultado = calculateTimeBalance(records);
      expect(resultado).toBe('+06:00');
    });
  });

  // ── calculateTodayPendingHours ──
  describe('calculateTodayPendingHours', () => {
    it('retorna "00:00" sem registros pendentes hoje', () => {
      const records = [
        { data: '2026-03-24', status: 'P', entrada1: '09:00', saida1: '18:00' },
      ];
      expect(calculateTodayPendingHours(records)).toBe('00:00');
    });

    it('soma apenas pendentes do dia atual', () => {
      const records = [
        { data: '2026-03-25', status: 'P', entrada1: '09:00', saida1: '12:00', entrada2: '13:00', saida2: '18:00' },
        { data: '2026-03-25', status: 'A', entrada1: '08:00', saida1: '12:00' },
        { data: '2026-03-24', status: 'P', entrada1: '09:00', saida1: '18:00' },
      ];
      expect(calculateTodayPendingHours(records)).toBe('08:00');
    });

    it('ignora registros rejeitados de hoje', () => {
      const records = [
        { data: '2026-03-25', status: 'R', entrada1: '09:00', saida1: '18:00' },
      ];
      expect(calculateTodayPendingHours(records)).toBe('00:00');
    });
  });

  // ── verificarSeEstaTrabalhandoAgora ──
  describe('verificarSeEstaTrabalhandoAgora', () => {
    it('retorna "noRecord" quando não há registro hoje', () => {
      const resultado = verificarSeEstaTrabalhandoAgora([]);
      expect(resultado.isWorking).toBe(false);
      expect(resultado.status).toBe('dashboard.noRecord');
    });

    it('retorna "working" quando tem entrada1 mas não saida1', () => {
      const records = [{ data: '2026-03-25', status: 'P', entrada1: '09:00', saida1: null }];
      const resultado = verificarSeEstaTrabalhandoAgora(records);
      expect(resultado.isWorking).toBe(true);
      expect(resultado.status).toBe('dashboard.working');
    });

    it('retorna "onBreak" quando tem saida1 mas não entrada2', () => {
      const records = [{ data: '2026-03-25', status: 'P', entrada1: '09:00', saida1: '12:00', entrada2: null }];
      const resultado = verificarSeEstaTrabalhandoAgora(records);
      expect(resultado.isWorking).toBe(false);
      expect(resultado.status).toBe('dashboard.onBreak');
    });

    it('retorna "working" quando tem entrada2 mas não saida2', () => {
      const records = [{ data: '2026-03-25', status: 'P', entrada1: '09:00', saida1: '12:00', entrada2: '13:00', saida2: null }];
      const resultado = verificarSeEstaTrabalhandoAgora(records);
      expect(resultado.isWorking).toBe(true);
      expect(resultado.status).toBe('dashboard.working');
    });

    it('retorna "dayCompleted" quando tem saida2', () => {
      const records = [{ data: '2026-03-25', status: 'A', entrada1: '09:00', saida1: '12:00', entrada2: '13:00', saida2: '18:00' }];
      const resultado = verificarSeEstaTrabalhandoAgora(records);
      expect(resultado.isWorking).toBe(false);
      expect(resultado.status).toBe('dashboard.dayCompleted');
    });

    it('ignora registros rejeitados do dia', () => {
      const records = [
        { data: '2026-03-25', status: 'R', entrada1: '09:00', saida1: null },
      ];
      const resultado = verificarSeEstaTrabalhandoAgora(records);
      expect(resultado.isWorking).toBe(false);
      expect(resultado.status).toBe('dashboard.noRecord');
    });
  });
});
