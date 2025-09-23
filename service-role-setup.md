# 🔑 Configuração da Service Role Key

Para resolver problemas de RLS (Row Level Security) na tabela "projetos", adicione esta configuração ao seu arquivo `.env`:

```env
# Service Role Key (para operações administrativas)
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

## Como obter a Service Role Key:

1. **Acesse o painel do Supabase:**
   - Vá para [supabase.com/dashboard](https://supabase.com/dashboard)

2. **Selecione seu projeto:**
   - Escolha o projeto que está usando

3. **Vá para Settings → API:**
   - No menu lateral esquerdo, clique em "Settings"
   - Depois clique na aba "API"

4. **Copie a Service Role Key:**
   - Procure pela seção "Project API keys"
   - Copie a chave "service_role" (não a "anon")

5. **Configure no .env:**
   ```env
   VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_copiada_aqui
   ```

## Benefícios desta abordagem:

✅ **Resolve problemas de RLS** automaticamente
✅ **Permite operações administrativas** completas
✅ **Funciona com políticas existentes** do banco
✅ **Não requer alterações** nas políticas de segurança

## ⚠️ Segurança:

- **Nunca commite** a Service Role Key no código
- **Use apenas em desenvolvimento** ou ambiente controlado
- **Em produção**, considere usar políticas RLS adequadas

---

**Após configurar a chave, reinicie o servidor de desenvolvimento:**
```bash
npm run dev
```
