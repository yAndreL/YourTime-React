-- Criação da tabela para registros de ponto
CREATE TABLE IF NOT EXISTS registro (
  id SERIAL PRIMARY KEY,
  dia DATE NOT NULL,
  hora_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  hora_entrada TIMESTAMPTZ NOT NULL,
  hora_saida TIMESTAMPTZ NOT NULL,
  pausa TIME NOT NULL,
  observacao TEXT
);

-- Índice para melhorar a performance de consultas por data
CREATE INDEX IF NOT EXISTS idx_registro_dia ON registro (dia);

-- Comentários nas colunas para documentação
COMMENT ON TABLE registro IS 'Tabela para armazenar registros de ponto dos usuários';
COMMENT ON COLUMN registro.id IS 'Identificador único do registro';
COMMENT ON COLUMN registro.dia IS 'Data do registro';
COMMENT ON COLUMN registro.hora_registro IS 'Timestamp de quando o registro foi inserido';
COMMENT ON COLUMN registro.hora_entrada IS 'Hora de entrada do funcionário';
COMMENT ON COLUMN registro.hora_saida IS 'Hora de saída do funcionário';
COMMENT ON COLUMN registro.pausa IS 'Tempo de pausa (hh:mm:ss)';
COMMENT ON COLUMN registro.observacao IS 'Observações adicionais sobre o registro';
