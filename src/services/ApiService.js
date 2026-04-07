/**
 * Cliente para chamadas ao servidor Express local (/api/*).
 * O Vite proxy `/api` para `http://localhost:3001` em dev.
 */
import { supabase } from '../config/supabase';

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiPost(path, body, { requireAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

async function apiGet(path, { requireAuth = false } = {}) {
  const headers = {};
  if (requireAuth) {
    const token = await getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, { headers });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }

  return data;
}

// ==========================================
// Auth / Recovery
// ==========================================

export function postAuthRecovery(email) {
  return apiPost('/auth/recovery/request', { email });
}

export function postAuthVerify(email, codigo) {
  return apiPost('/auth/recovery/verify', { email, codigo });
}

export function postAuthReset(tempToken, newPassword) {
  return apiPost('/auth/recovery/reset', { temp_token: tempToken, new_password: newPassword });
}

// ==========================================
// Batidas (server-side validation)
// ==========================================

/**
 * Registra batida via servidor Express.
 * O servidor valida estado, projeto, geocerca e gera timestamp_servidor.
 */
export function postRegistrarBatida({ tipo, projetoId, latitude, longitude, precisaoGps, observacao }) {
  return apiPost('/batidas/registrar', {
    tipo,
    projetoId,
    latitude,
    longitude,
    precisaoGps,
    observacao
  }, { requireAuth: true });
}

/**
 * Consulta estado atual da jornada do usuario.
 */
export function getStatusBatida(dia) {
  let path = '/batidas/estado';
  if (dia) path += `?dia=${dia}`;
  return apiGet(path, { requireAuth: true });
}
