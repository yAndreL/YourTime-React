-- Preferência de tema do usuário (light | dark | system)
-- Execute no SQL Editor do Supabase (ou psql) após fazer backup.

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS preferencia_tema TEXT DEFAULT 'light';

UPDATE configuracoes
SET preferencia_tema = 'light'
WHERE preferencia_tema IS NULL OR TRIM(preferencia_tema) = '';

COMMENT ON COLUMN configuracoes.preferencia_tema IS 'Tema da interface: light, dark ou system';
