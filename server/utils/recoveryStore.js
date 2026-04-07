import { createClient } from '@supabase/supabase-js';
import { randomInt, randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

function hashCodigo(codigo) {
  return createHash('sha256').update(String(codigo)).digest('hex');
}

/**
 * Gera um codigo de 6 digitos usando crypto.randomInt (CSPRNG).
 */
export function gerarCodigo() {
  return randomInt(100000, 1000000).toString();
}

/**
 * Armazena o hash do codigo de recovery no banco com TTL de 10 minutos.
 */
export async function armazenarRecovery(email, codigo) {
  const codeHash = hashCodigo(codigo);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const { error } = await supabase
    .from('recovery_tokens')
    .insert({ email, code_hash: codeHash, expires_at: expiresAt.toISOString() });

  if (error) throw new Error(`Erro ao armazenar token: ${error.message}`);
}

/**
 * Verifica o codigo recebido. Se valido, retorna um temp_token.
 */
export async function verificarCodigo(email, codigo) {
  const codeHash = hashCodigo(codigo);
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from('recovery_tokens')
    .select('id')
    .eq('email', email)
    .eq('code_hash', codeHash)
    .eq('used', false)
    .eq('verified', false)
    .gt('expires_at', agora)
    .maybeSingle();

  if (error) throw new Error(`Erro ao verificar token: ${error.message}`);
  if (!data) return null;

  const tempToken = randomUUID();

  const { error: updateError } = await supabase
    .from('recovery_tokens')
    .update({ verified: true, temp_token: tempToken })
    .eq('id', data.id);

  if (updateError) throw new Error(`Erro ao atualizar token: ${updateError.message}`);

  return { temp_token: tempToken };
}

/**
 * Usa o temp_token para identificar o usuario e reseta a senha
 * via Supabase Auth Admin API (HTTP direto com service role key).
 */
export async function resetarSenha(tempToken, novaSenha) {
  const { data, error } = await supabase
    .from('recovery_tokens')
    .select('email')
    .eq('temp_token', tempToken)
    .eq('used', false)
    .eq('verified', true)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar token: ${error.message}`);
  if (!data) return { success: false, error: 'Token invalido ou expirado' };

  const email = data.email;

  // Invalida o token ANTES de resetar (prevents replay attacks)
  const { error: updateError } = await supabase
    .from('recovery_tokens')
    .update({ used: true })
    .eq('temp_token', tempToken);

  if (updateError) throw new Error(`Erro ao invalidar token: ${updateError.message}`);

  // Busca o usuario pelo email via Admin API
  const encodedEmail = encodeURIComponent(email);
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?email=${encodedEmail}&page=1&perPage=1`,
    {
      method: 'GET',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!resp.ok) return { success: false, error: 'Erro ao buscar usuario no Supabase Auth' };

  const body = await resp.json();
  const users = body.users || [];
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

  if (!user) return { success: false, error: 'Usuario nao encontrado' };

  // Atualiza a senha via Admin API
  const updateResp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
    {
      method: 'PUT',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: novaSenha })
    }
  );

  if (!updateResp.ok) {
    const errBody = await updateResp.json().catch(() => ({}));
    return { success: false, error: errBody.msg || 'Erro ao atualizar senha' };
  }

  return { success: true };
}

/**
 * Remove tokens expirados do banco (pode ser chamado periodicamente).
 */
export async function limparTokensExpirados() {
  const { error } = await supabase
    .from('recovery_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) throw new Error(`Erro ao limpar tokens: ${error.message}`);
}
