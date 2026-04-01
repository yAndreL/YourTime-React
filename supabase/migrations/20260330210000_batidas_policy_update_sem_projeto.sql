-- Política de UPDATE: usuário autenticado só atualiza próprias linhas enquanto projeto_id IS NULL
-- (associação de projeto; impede troca indevida de projeto em histórico).
--
-- Pré-requisito: RLS em public.batidas deve estar habilitado no painel Supabase para esta política surtir efeito.
-- Revise outras políticas FOR UPDATE em batidas: em Postgres, políticas permissivas são combinadas com OR;
-- uma política genérica de UPDATE pode anular esta restrição.
--
-- Auditoria (executar no SQL Editor antes/depois de aplicar migrações em batidas):
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'batidas' AND cmd = 'UPDATE';
--
-- Se aparecer mais de uma política permissiva FOR UPDATE, qualquer uma que permita UPDATE amplo
-- torna a restrição deste arquivo ineficaz. Remova ou restrinja políticas conflitantes, ou consolide
-- em uma única política de UPDATE alinhada à regra de negócio.

DROP POLICY IF EXISTS "batidas_authenticated_update_projeto_quando_sem_projeto" ON public.batidas;

CREATE POLICY "batidas_authenticated_update_projeto_quando_sem_projeto"
ON public.batidas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND projeto_id IS NULL)
WITH CHECK (auth.uid() = user_id);
