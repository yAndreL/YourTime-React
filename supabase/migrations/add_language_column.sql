-- Adicionar coluna de idioma na tabela configuracoes
ALTER TABLE configuracoes
ADD COLUMN language varchar(10) DEFAULT 'pt-BR';

-- Adicionar comentário na coluna
COMMENT ON COLUMN configuracoes.language IS 'Idioma preferido do usuário (pt-BR, en-US, es-ES, fr-FR)';

-- Atualizar registros existentes para ter o idioma padrão
UPDATE configuracoes
SET language = 'pt-BR'
WHERE language IS NULL;
