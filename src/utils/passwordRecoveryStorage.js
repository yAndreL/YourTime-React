const STORAGE_KEY = 'yt_password_recovery_v1';
const TTL_EMAIL_MS = 15 * 60 * 1000;
const TTL_TEMP_TOKEN_MS = 15 * 60 * 1000;

/**
 * Salva apenas o email (para UX na tela de verificacao).
 * NUNCA salva codigo — o codigo e gerenciado pelo servidor.
 */
export function salvarRecuperacaoEmail(email) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: String(email).trim().toLowerCase(),
        ts: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Le o email pendente de recovery. Se expirado, limpa.
 */
export function lerRecuperacaoPendente() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.email) return null;
    if (Date.now() - p.ts > TTL_EMAIL_MS) {
      limparRecuperacao();
      return null;
    }
    return { email: p.email };
  } catch {
    return null;
  }
}

/**
 * Salva o temp_token recebido apos verificacao server-side.
 */
export function salvarTempToken(token) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        temp_token: token,
        ts: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Le o temp_token armazenado. Se expirado, limpa.
 */
export function lerTempToken() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.temp_token) return null;
    if (Date.now() - p.ts > TTL_TEMP_TOKEN_MS) {
      limparRecuperacao();
      return null;
    }
    return { temp_token: p.temp_token };
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
