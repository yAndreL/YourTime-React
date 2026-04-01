-- Consultas de batidas sem projeto por usuário e intervalo de tempo (contagem, listagem, export).

CREATE INDEX IF NOT EXISTS idx_batidas_user_ts_sem_projeto
ON public.batidas (user_id, timestamp_servidor)
WHERE projeto_id IS NULL;
