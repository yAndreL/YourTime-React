import { describe, it, expect } from 'vitest';
import GeoFotoService from '../../services/GeoFotoService';

describe('GeoFotoService — verificarDentroDaCerca', () => {
  const SEDE_LAT = -23.5505;
  const SEDE_LNG = -46.6333;
  const RAIO = 200;

  it('retorna null se algum parâmetro é falsy', () => {
    expect(GeoFotoService.verificarDentroDaCerca(null, -46.6, SEDE_LAT, SEDE_LNG, RAIO)).toBeNull();
    expect(GeoFotoService.verificarDentroDaCerca(-23.5, null, SEDE_LAT, SEDE_LNG, RAIO)).toBeNull();
    expect(GeoFotoService.verificarDentroDaCerca(-23.5, -46.6, null, SEDE_LNG, RAIO)).toBeNull();
    expect(GeoFotoService.verificarDentroDaCerca(-23.5, -46.6, SEDE_LAT, null, RAIO)).toBeNull();
    expect(GeoFotoService.verificarDentroDaCerca(-23.5, -46.6, SEDE_LAT, SEDE_LNG, null)).toBeNull();
  });

  it('identifica ponto dentro do raio (mesma coordenada)', () => {
    const resultado = GeoFotoService.verificarDentroDaCerca(SEDE_LAT, SEDE_LNG, SEDE_LAT, SEDE_LNG, RAIO);
    expect(resultado.dentroDoRaio).toBe(true);
    expect(resultado.distanciaMetros).toBe(0);
  });

  it('identifica ponto dentro do raio (próximo)', () => {
    const latProxima = SEDE_LAT + 0.001;
    const resultado = GeoFotoService.verificarDentroDaCerca(latProxima, SEDE_LNG, SEDE_LAT, SEDE_LNG, RAIO);
    expect(resultado.dentroDoRaio).toBe(true);
    expect(resultado.distanciaMetros).toBeLessThan(RAIO);
  });

  it('identifica ponto fora do raio (distante)', () => {
    const latDistante = SEDE_LAT + 0.1;
    const resultado = GeoFotoService.verificarDentroDaCerca(latDistante, SEDE_LNG, SEDE_LAT, SEDE_LNG, RAIO);
    expect(resultado.dentroDoRaio).toBe(false);
    expect(resultado.distanciaMetros).toBeGreaterThan(RAIO);
  });

  it('retorna raioMetros configurado no resultado', () => {
    const resultado = GeoFotoService.verificarDentroDaCerca(SEDE_LAT, SEDE_LNG, SEDE_LAT, SEDE_LNG, 500);
    expect(resultado.raioMetros).toBe(500);
  });

  it('respeita raio grande (1km) para pontos moderadamente distantes', () => {
    const latModerada = SEDE_LAT + 0.005;
    const resultado = GeoFotoService.verificarDentroDaCerca(latModerada, SEDE_LNG, SEDE_LAT, SEDE_LNG, 1000);
    expect(resultado.dentroDoRaio).toBe(true);
  });

  it('calcula distância com fórmula de Haversine', () => {
    const lat2 = -23.5515;
    const lng2 = -46.6343;
    const resultado = GeoFotoService.verificarDentroDaCerca(lat2, lng2, SEDE_LAT, SEDE_LNG, 500);
    expect(resultado.distanciaMetros).toBeGreaterThan(0);
    expect(typeof resultado.distanciaMetros).toBe('number');
    expect(Number.isInteger(resultado.distanciaMetros)).toBe(true);
  });
});
