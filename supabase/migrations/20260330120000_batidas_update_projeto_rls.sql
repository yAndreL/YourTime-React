-- Política sugerida: usuário autenticado pode atualizar apenas suas próprias batidas,
-- preferencialmente apenas projeto_id / empresa_id (ajuste nomes de colunas se o schema diferir).
-- Execute no SQL Editor do Supabase ou via CLI após revisar.

-- Exemplo (descomente e adapte se não existir política equivalente):

-- CREATE POLICY "Usuarios atualizam projeto em suas batidas"
-- ON public.batidas
-- FOR UPDATE
-- TO authenticated
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id);

-- Para restringir apenas preenchimento de projeto em linhas que ainda estão sem projeto,
-- use uma função SECURITY DEFINER ou valide no app (já feito em BatidaService).
