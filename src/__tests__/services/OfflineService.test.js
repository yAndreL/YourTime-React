import { describe, it, expect, beforeEach, vi } from 'vitest';
import OfflineService from '../../services/OfflineService';

const OFFLINE_KEY = 'yourtime-offline-batidas';

describe('OfflineService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── salvarBatidaOffline ──
  describe('salvarBatidaOffline', () => {
    it('salva batida no localStorage', () => {
      const batida = { user_id: 'abc', tipo: 'entrada' };
      const resultado = OfflineService.salvarBatidaOffline(batida);
      expect(resultado).toBe(true);

      const salvas = JSON.parse(localStorage.getItem(OFFLINE_KEY));
      expect(salvas).toHaveLength(1);
      expect(salvas[0].user_id).toBe('abc');
      expect(salvas[0].tipo).toBe('entrada');
    });

    it('adiciona id_temp e sincronizada=false automaticamente', () => {
      OfflineService.salvarBatidaOffline({ tipo: 'entrada' });
      const salvas = JSON.parse(localStorage.getItem(OFFLINE_KEY));
      expect(salvas[0].id_temp).toMatch(/^offline_/);
      expect(salvas[0].sincronizada).toBe(false);
      expect(salvas[0].created_at_offline).toBeDefined();
    });

    it('preserva batidas existentes ao adicionar nova', () => {
      OfflineService.salvarBatidaOffline({ tipo: 'entrada' });
      OfflineService.salvarBatidaOffline({ tipo: 'pausa' });
      const salvas = JSON.parse(localStorage.getItem(OFFLINE_KEY));
      expect(salvas).toHaveLength(2);
    });
  });

  // ── obterBatidasOffline ──
  describe('obterBatidasOffline', () => {
    it('retorna array vazio quando não há batidas salvas', () => {
      expect(OfflineService.obterBatidasOffline()).toEqual([]);
    });

    it('retorna batidas salvas', () => {
      OfflineService.salvarBatidaOffline({ tipo: 'entrada' });
      OfflineService.salvarBatidaOffline({ tipo: 'saida' });
      const batidas = OfflineService.obterBatidasOffline();
      expect(batidas).toHaveLength(2);
    });

    it('retorna array vazio para JSON inválido no localStorage', () => {
      localStorage.setItem(OFFLINE_KEY, 'json-invalido');
      expect(OfflineService.obterBatidasOffline()).toEqual([]);
    });
  });

  // ── contarBatidasPendentes ──
  describe('contarBatidasPendentes', () => {
    it('retorna 0 quando não há batidas', () => {
      expect(OfflineService.contarBatidasPendentes()).toBe(0);
    });

    it('conta apenas batidas não sincronizadas', () => {
      const batidas = [
        { tipo: 'entrada', id_temp: 'offline_1', sincronizada: false },
        { tipo: 'pausa', id_temp: 'offline_2', sincronizada: true },
        { tipo: 'retorno', id_temp: 'offline_3', sincronizada: false },
      ];
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(batidas));
      expect(OfflineService.contarBatidasPendentes()).toBe(2);
    });
  });

  // ── limparSincronizadas ──
  describe('limparSincronizadas', () => {
    it('remove batidas já sincronizadas, mantém pendentes', () => {
      const batidas = [
        { tipo: 'entrada', id_temp: 'offline_1', sincronizada: true },
        { tipo: 'pausa', id_temp: 'offline_2', sincronizada: false },
        { tipo: 'retorno', id_temp: 'offline_3', sincronizada: true },
      ];
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(batidas));

      OfflineService.limparSincronizadas();

      const restantes = JSON.parse(localStorage.getItem(OFFLINE_KEY));
      expect(restantes).toHaveLength(1);
      expect(restantes[0].id_temp).toBe('offline_2');
    });

    it('limpa tudo se todas estão sincronizadas', () => {
      const batidas = [
        { tipo: 'entrada', id_temp: 'offline_1', sincronizada: true },
      ];
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(batidas));

      OfflineService.limparSincronizadas();

      const restantes = JSON.parse(localStorage.getItem(OFFLINE_KEY));
      expect(restantes).toHaveLength(0);
    });
  });

  // ── estaOnline ──
  describe('estaOnline', () => {
    it('retorna o valor de navigator.onLine', () => {
      const resultado = OfflineService.estaOnline();
      expect(typeof resultado).toBe('boolean');
    });
  });
});
