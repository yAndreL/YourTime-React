const STORAGE_KEY = 'yt_password_recovery_v1';
const TTL_CODIGO_MS = 15 * 60 * 1000;
const TTL_VERIFICADO_MS = 30 * 60 * 1000;

export function salvarRecuperacaoCodigo(email, codigo) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: String(email).trim().toLowerCase(),
        code: String(codigo),
        ts: Date.now(),
        verified: false
      })
    );
  } catch {
    /* ignore */
  }
}

export function marcarCodigoVerificado(email) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...base,
        email: String(email).trim().toLowerCase(),
        verified: true,
        ts: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

export function lerRecuperacaoPendente() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.email || !p?.code) return null;
    if (Date.now() - p.ts > TTL_CODIGO_MS) {
      limparRecuperacao();
      return null;
    }
    return { email: p.email, code: String(p.code) };
  } catch {
    return null;
  }
}

export function lerRecuperacaoVerificada() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.verified || !p?.email) return null;
    if (Date.now() - p.ts > TTL_VERIFICADO_MS) {
      limparRecuperacao();
      return null;
    }
    return { email: p.email };
  } catch {
    return null;
  }
}

export function limparRecuperacao() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
