-- Migration: tabela de tokens para recuperacao segura de senha
-- O servidor (Express) usa service role key para acessar esta tabela.
-- Ninguém acessa direto do frontend — RLS DENY ALL.

CREATE TABLE IF NOT EXISTS recovery_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  temp_token uuid UNIQUE,
  verified boolean DEFAULT false,
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS: negar tudo do frontend (acesso apenas via service role key no server)
ALTER TABLE recovery_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all_recovery_tokens ON recovery_tokens FOR ALL
  USING (false);
