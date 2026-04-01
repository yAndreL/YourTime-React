import { describe, it, expect, beforeEach } from 'vitest';
import {
  obterTextoDataLocalYYYYMMDD,
  montarChaveAvisoProjetoBatidaDoDia,
  verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia,
  registrarAvisoProjetoBatidaExibidoNoDia,
  salvarUltimoProjetoBatidaMinimoNoArmazenamento,
  analisarUltimoProjetoBatidaDoArmazenamento,
  verificarSeUsuarioPossuiProjetoSelecionado
} from '../../utils/batidaProjetoArmazenamento';

describe('batidaProjetoArmazenamento', () => {
  let armazenamento;

  beforeEach(() => {
    armazenamento = new Map();
    const mock = {
      getItem: k => (armazenamento.has(k) ? armazenamento.get(k) : null),
      setItem: (k, v) => {
        armazenamento.set(k, v);
      },
      removeItem: k => armazenamento.delete(k)
    };
    global.localStorage = mock;
  });

  it('obterTextoDataLocalYYYYMMDD formata ano-mês-dia', () => {
    const d = new Date(2026, 2, 5);
    expect(obterTextoDataLocalYYYYMMDD(d)).toBe('2026-03-05');
  });

  it('montarChaveAvisoProjetoBatidaDoDia inclui data', () => {
    expect(montarChaveAvisoProjetoBatidaDoDia('2026-03-30')).toContain('2026-03-30');
  });

  it('registrar e verificar aviso do dia', () => {
    const data = '2026-03-30';
    expect(verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia(data, global.localStorage)).toBe(false);
    registrarAvisoProjetoBatidaExibidoNoDia(data, global.localStorage);
    expect(verificarSeJaFoiExibidoAvisoProjetoBatidaNoDia(data, global.localStorage)).toBe(true);
  });

  it('salvar e analisar último projeto', () => {
    salvarUltimoProjetoBatidaMinimoNoArmazenamento(
      { id: 'p1', nome: 'Alpha', empresa_id: 'e1' },
      global.localStorage
    );
    const obj = analisarUltimoProjetoBatidaDoArmazenamento(null, global.localStorage);
    expect(obj).toEqual({ id: 'p1', nome: 'Alpha', empresa_id: 'e1' });
  });

  it('verificarSeUsuarioPossuiProjetoSelecionado com JSON válido', () => {
    global.localStorage.setItem('selectedProject', JSON.stringify({ id: 'x', nome: 'N' }));
    expect(verificarSeUsuarioPossuiProjetoSelecionado(global.localStorage)).toBe(true);
  });

  it('verificarSeUsuarioPossuiProjetoSelecionado sem projeto', () => {
    expect(verificarSeUsuarioPossuiProjetoSelecionado(global.localStorage)).toBe(false);
  });
});
