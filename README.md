# YourTime (React)

Aplicação web de **gestão de ponto e projetos**, com autenticação e dados no **Supabase** (PostgreSQL, Auth e Storage).

## Requisitos

- Node.js 18+ (recomendado 20 LTS)
- Conta e projeto no [Supabase](https://supabase.com)

## Configuração

1. Clone o repositório e instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env` na raiz (use o exemplo abaixo):

```env
VITE_SUPABASE_URL=https://SEU_REFERENCIA.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Opcional (somente se precisar de operações administrativas pelo cliente — evite em produção):

```env
VITE_SUPABASE_SECRET_KEY=
```

3. No **SQL Editor** do Supabase, execute o script `database/schema_supabase.sql` para criar tabelas, RLS, trigger de `profiles`, função `reset_user_password`, bucket `avatars` e políticas de storage.

4. Em **Authentication**, cadastre usuários; o trigger cria o registro em `public.profiles`. Perfis com `role = 'admin'` acessam rotas administrativas.

## Scripts npm

| Comando        | Descrição                          |
|----------------|-------------------------------------|
| `npm run dev`  | Servidor de desenvolvimento (Vite) |
| `npm run build`| Build de produção em `dist/`        |
| `npm run preview` | Pré-visualiza o build            |
| `npm run lint` | ESLint                              |

Outros scripts em `package.json` (`server`, `setup`, `keep-alive`, etc.) podem depender de arquivos extras que não vêm no núcleo do front-end; use apenas se existirem no seu ambiente.

## Estrutura principal

- `src/main.jsx` — rotas e providers
- `src/App_clean_new.jsx` — dashboard após login
- `src/views/` — telas (login, ponto, histórico, projetos, perfil, admin, etc.)
- `src/components/` — UI reutilizável
- `src/config/supabase.js` — cliente Supabase
- `src/i18n/translations.js` — textos (pt-BR, en-US, es, fr)
- `database/schema_supabase.sql` — esquema oficial do banco

## Tecnologias

React 19, React Router 7, Vite 7, Tailwind CSS, Supabase JS v2, Chart.js, jsPDF, ExcelJS.

## Segurança

- Não commite `.env` com chaves reais.
- A função `reset_user_password` no SQL está exposta a `anon` por conveniência de desenvolvimento; em produção restrinja (por exemplo Edge Function + validação do código).
- RLS atual é permissiva para `authenticated`; refine políticas por empresa/usuário antes de ambiente público.

## Licença

Projeto privado (`"private": true` no `package.json`). Ajuste conforme a licença do seu produto.
