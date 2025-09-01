# YourTime - Sistema de Registro de Ponto

Sistema de registro de ponto desenvolvido com React, Express e Supabase.

## 🚀 Configuração do Ambiente

### Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta no Supabase (opcional, para sua própria instância)

### Configuração Inicial

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd YourTime-React
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   # Opção 1: Copie o arquivo de exemplo manualmente
   cp .env.example .env
   
   # Opção 2: Use o script de setup automático
   npm run setup
   
   # Opção 3: Para desenvolvimento rápido
   npm run setup:dev
   ```

4. **Edite o arquivo `.env`** com suas configurações:
   ```env
   # Configurações do Banco de Dados
   DB_HOST=seu-host-do-banco
   DB_PORT=5432
   DB_NAME=seu-banco
   DB_USER=seu-usuario
   DB_PASSWORD=sua-senha
   DB_SSL=true

   # Configurações do Supabase
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_ANON_KEY=sua-chave-publica-supabase

   # Configurações do Servidor
   PORT=3001
   NODE_ENV=development

   # Configurações da API Frontend
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-supabase
   ```

5. **Inicie o projeto**
   ```bash
   # Iniciar frontend e backend simultaneamente
   npm run dev:full

   # Ou executar separadamente:
   npm run dev      # Frontend (Vite)
   npm run server   # Backend (Express)
   ```

## 📁 Estrutura do Projeto

```
YourTime-React/
├── backend/           # API Express
│   ├── controllers/   # Controladores da API
│   ├── routes/        # Rotas da API
│   └── services/      # Serviços (banco de dados)
├── src/              # Frontend React
│   ├── components/   # Componentes React
│   ├── config/       # Configurações (Supabase)
│   ├── constants/    # Constantes da aplicação
│   ├── hooks/        # Custom hooks
│   ├── services/     # Serviços do frontend
│   └── views/        # Páginas/Views
├── .env              # Variáveis de ambiente (não versionado)
├── .env.example      # Exemplo de configuração
└── server.js         # Servidor Express principal
```

## 🔧 Scripts Disponíveis

### Desenvolvimento
- `npm run setup` - Setup automático do ambiente
- `npm run setup:dev` - Setup rápido para desenvolvimento  
- `npm run dev` - Inicia o frontend em modo desenvolvimento
- `npm run server` - Inicia apenas o servidor backend
- `npm run dev:full` - Inicia frontend + backend simultaneamente

### Produção
- `npm run setup:prod` - Setup para produção
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção

### Utilitários
- `npm run lint` - Executa o linter ESLint

## 🗄️ Banco de Dados

O projeto utiliza PostgreSQL através do Supabase. Para configurar sua própria instância:

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e a chave pública do projeto
4. Atualize o arquivo `.env` com suas credenciais

## 🌐 Deploy

### Para Produção

1. Configure as variáveis de ambiente para produção
2. Atualize `VITE_API_BASE_URL` para a URL do seu servidor
3. Execute o build:
   ```bash
   npm run build
   ```

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
VITE_API_BASE_URL=https://seu-dominio.com/api
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

## 🔒 Segurança

### ⚠️ Configurações Importantes
- **Nunca** commit o arquivo `.env` no controle de versão
- Use sempre variáveis de ambiente para credenciais sensíveis
- Para o frontend (Vite), use o prefixo `VITE_` apenas para variáveis não sensíveis
- Mantenha as chaves do Supabase seguras e não as exponha em repositórios públicos

### 🏠 Ambientes Diferentes
- `.env` - Arquivo principal (não versionado)
- `.env.example` - Template para novos desenvolvedores  
- `.env.development` - Configurações de desenvolvimento
- `.env.production` - Template para produção

### 🛡️ Boas Práticas
1. Use senhas fortes para o banco de dados
2. Ative autenticação de dois fatores no Supabase
3. Configure RLS (Row Level Security) nas tabelas do Supabase
4. Use HTTPS em produção
5. Monitore logs de acesso e erro

## 🐛 Solução de Problemas

### Erro de Conexão com Banco
- Verifique se as credenciais no `.env` estão corretas
- Confirme se o Supabase está acessível
- Teste a conexão através da interface do sistema

### Porta em Uso
- Altere a variável `PORT` no arquivo `.env`
- Ou termine os processos que estão usando a porta 3001

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request
