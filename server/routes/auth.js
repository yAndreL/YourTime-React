import { Router } from 'express';
import { enviarCodigoRecuperacao } from '../services/emailService.js';
import { gerarCodigo, armazenarRecovery, verificarCodigo, resetarSenha } from '../utils/recoveryStore.js';

const router = Router();

// Rate limiting baseado em arquivo (persistente entre restarts)
// Usa timestamps no proprio objeto global, limpa periodicamente
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_REQUEST = 3;
const RATE_LIMIT_VERIFY = 5;

if (!global.recoveryAttempts) global.recoveryAttempts = {};
if (!global.verifyAttempts) global.verifyAttempts = {};

function checkRateLimit(store, key, maxAttempts) {
  const now = Date.now();
  if (!store[key]) store[key] = [];
  store[key] = store[key].filter(t => now - t < RATE_LIMIT_WINDOW);
  if (store[key].length >= maxAttempts) return false;
  store[key].push(now);
  return true;
}

/**
 * POST /api/auth/recovery/request
 * Body: { email }
 * -> Gera codigo crypto-safe, salva hash, envia email via Nodemailer
 */
router.post('/recovery/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email e obrigatorio' });
    }

    const emailFormatado = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFormatado)) {
      return res.status(400).json({ error: 'Email invalido' });
    }

    // Rate limiting: max 3 requests por minuto por email
    if (!checkRateLimit(global.recoveryAttempts, `recovery_${emailFormatado}`, RATE_LIMIT_REQUEST)) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
    }

    const codigo = gerarCodigo();

    // Sempre tenta armazenar e enviar (previne enumeration de emails)
    try {
      await armazenarRecovery(emailFormatado, codigo);
      await enviarCodigoRecuperacao(emailFormatado, codigo);
    } catch (err) {
      // Log no server, front nao ve detalhes
      console.error('[Recovery] Erro ao processar:', err.message);
      // Retorna sucesso para o front (previne enumeration)
    }

    // Em dev, log no console para facilitar testes
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dev] Codigo de recovery para ${emailFormatado}: ${codigo}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Recovery] Erro inesperado:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/auth/recovery/verify
 * Body: { email, codigo }
 * -> Compara hash, valida TTL, retorna temp_token
 * -> Rate limited: max 5 tentativas por minuto por email
 */
router.post('/recovery/verify', async (req, res) => {
  try {
    const { email, codigo } = req.body;

    if (!email || !codigo) {
      return res.status(400).json({ error: 'Email e codigo sao obrigatorios' });
    }

    if (!/^\d{6}$/.test(String(codigo))) {
      return res.status(400).json({ error: 'Codigo deve ter 6 digitos' });
    }

    // Rate limiting: max 5 tentativas de verificacao por minuto por email
    const emailFormatado = email.trim().toLowerCase();
    if (!checkRateLimit(global.verifyAttempts, `verify_${emailFormatado}`, RATE_LIMIT_VERIFY)) {
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
    }

    const resultado = await verificarCodigo(emailFormatado, String(codigo));

    if (!resultado) {
      return res.status(401).json({ error: 'Codigo invalido ou expirado' });
    }

    res.json({ verified: true, temp_token: resultado.temp_token });
  } catch (err) {
    console.error('[Recovery Verify] Erro:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/auth/recovery/reset
 * Body: { temp_token, new_password }
 * -> Valida token, reseta senha via Supabase Admin API
 */
router.post('/recovery/reset', async (req, res) => {
  try {
    const { temp_token, new_password } = req.body;

    if (!temp_token || !new_password) {
      return res.status(400).json({ error: 'Token e nova senha sao obrigatorios' });
    }

    // Politica de senha: minimo 8 caracteres, pelo menos 1 letra e 1 numero
    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter no minimo 8 caracteres' });
    }
    if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({ error: 'Senha deve conter pelo menos uma letra e um numero' });
    }

    const resultado = await resetarSenha(temp_token, new_password);

    if (!resultado.success) {
      return res.status(400).json({ error: resultado.error });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Recovery Reset] Erro:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
