# YourTime - Sistema de Gestão de Tempo ⏰# YourTime - Sistema de Gestão de Tempo ⏰



Sistema completo de gestão de tempo e registro de ponto desenvolvido com React e Supabase.Sistema completo de gestão de tempo e registro de ponto desenvolvido com React e Supabase.



## 🚀 Tecnologias## 🚀 Tecnologias



- **Frontend**: React 18 + Vite- **Frontend**: React 18 + Vite

- **Backend**: Supabase (PostgreSQL + Authentication + Storage + Realtime)- **Backend**: Supabase (PostgreSQL + Authentication + Storage + Realtime)

- **Estilização**: Tailwind CSS- **Estilização**: Tailwind CSS

- **Ícones**: React Icons (Feather Icons)- **Ícones**: React Icons (Feather Icons)

- **Roteamento**: React Router DOM- **Roteamento**: React Router DOM

- **PDF**: jsPDF + autoTable- **PDF**: jsPDF + autoTable

- **Hospedagem**: Vercel / Netlify (recomendado)- **Hospedagem**: Vercel / Netlify (recomendado)



## 📋 Pré-requisitos## 📋 Pré-requisitos



- Node.js (versão 16 ou superior)- Node.js (versão 16 ou superior)

- npm ou yarn- npm ou yarn

- Conta no Supabase (para produção)- Conta no Supabase (para produção)



## ✨ Funcionalidades Principais### Configuração Inicial



### 🔐 Autenticação e Permissões## 📋 Funcionalidades

- Sistema de login seguro com Supabase Auth

- Recuperação de senha1. **Clone o repositório**

- Dois níveis de acesso: **Admin** e **Usuário**

- Proteção de rotas por autenticação e role### 🔐 Autenticação e Permissões   ```bash

- Sistema de cargos dinâmico com níveis de acesso

- Row Level Security (RLS) no banco de dados- Sistema de login com email e senha   git clone <url-do-repositorio>



### 👤 Perfil de Usuário- Recuperação de senha   cd YourTime-React

- Visualização e edição de dados pessoais

- Upload de foto de perfil (avatar) com storage- Dois níveis de acesso: **Admin** e **Usuário**   ```

- Exibição de estatísticas pessoais

- Histórico de atividades- Proteção de rotas por autenticação e role



### ⏱️ Registro de Ponto- Sistema de cargos dinâmico com níveis de acesso2. **Instale as dependências**

- Formulário intuitivo para registro de horas

- Seleção de projeto vinculado   ```bash

- Campos de entrada/saída (2 turnos com intervalo)

- Cálculo automático de horas trabalhadas### 👤 Perfil de Usuário   npm install

- Status de aprovação (Pendente, Aprovado, Rejeitado)

- Visualização e edição de dados pessoais   ```

### 🔔 Sistema de Notificações ✨ NOVO!

- **Notificações In-App** em tempo real- Upload de foto de perfil (avatar)

- Sino de notificações no header com badge de contagem

- Tipos de notificações:- Exibição de estatísticas pessoais:3. **Configure as variáveis de ambiente**

  - ✅ Pontos registrados

  - 👍 Pontos aprovados/rejeitados  - Total de horas trabalhadas   ```bash

  - ⏰ Lembretes automáticos de registro

  - ⏳ Aprovações pendentes (para admins)  - Projetos ativos   # Opção 1: Copie o arquivo de exemplo manualmente

- **Lembretes Automáticos Inteligentes**:

  - Lembrete no horário de entrada  - Média de horas por dia   cp .env.example .env

  - Lembrete no horário de intervalo (saída e retorno)

  - Lembrete 15 minutos antes da saída- Histórico de atividades   

  - Lembrete no horário de saída

- **Emails Automáticos** via Supabase Edge Functions (configurável)   # Opção 2: Use o script de setup automático

- Subscribe em tempo real com Supabase Realtime

- Marcar notificações como lidas individualmente ou em massa### ⏱️ Registro de Ponto   npm run setup

- Deletar notificações

- Formulário intuitivo para registro de horas   

### ⚙️ Configurações Personalizadas ✨ NOVO!

- **Configurações salvas por usuário** no banco de dados- Seleção de projeto   # Opção 3: Para desenvolvimento rápido

- **Notificações**:

  - 📧 Habilitar/desabilitar email de relatórios semanais- Campos de entrada/saída (2 turnos)   npm run setup:dev

  - ⏰ Habilitar/desabilitar lembretes de registro de ponto

- **Jornada de Trabalho**:- Cálculo automático de horas trabalhadas   ```

  - Horário de entrada padrão

  - Horário de saída padrão- Data e descrição de atividades

  - Horas semanais esperadas

  - Fuso horário personalizado4. **Edite o arquivo `.env`** com suas configurações:

- **Relatórios**:

  - Formato de exportação padrão (PDF, Excel, CSV)
  - 📊 Incluir gráficos nos relatórios PDF (ativa/desativa)
- 🔄 Restaurar configurações padrão com um clique

### 📤 Exportação de Dados (CSV e XLSX) ✨ NOVO!

#### 📄 CSV - Dados Brutos
- Exportação simples de dados tabulares
- Arquivo leve e rápido
- Para integração com outros sistemas
- Análise de dados em planilhas
- Formato universal (Excel, Google Sheets, etc.)

#### 📊 XLSX - Relatório Visual Profissional
- **Relatório formatado automaticamente com:**
  - 🎨 Tabelas com cores e bordas profissionais
  - 📈 Gráfico de Pizza (distribuição por status)
  - 📊 Gráfico de Barras Empilhadas (horas por dia)
  - 🎯 Formatação condicional por status:
    - 🟢 Verde = Aprovado
    - 🟡 Amarelo = Pendente
    - 🔴 Vermelho = Rejeitado
  
- **Estrutura do XLSX:**
  1. Dados do Funcionário (nome, e-mail, cargo, departamento)
  2. Estatísticas do Período (horas totais, extras, média diária)
  3. Gráfico de Distribuição por Status (Pizza)
  4. Gráfico de Horas Trabalhadas por Dia (Barras)
  5. Tabela Detalhada de Registros (todos os campos)

- **Tecnologia:**
  - Backend Python com Flask
  - Biblioteca xlsxwriter para geração Excel
  - Gráficos nativos do Excel
  - Exportação em memória (rápida)

- **Instalação do Serviço Python:**
  ```bash
  cd python
  .\install-python-service.ps1  # Windows
  # ou
  python -m venv venv
  source venv/bin/activate  # Linux/Mac
  pip install -r requirements.txt
  ```

- **Execução:**
  ```bash
  # Opção 1: Tudo junto
  npm run dev:all

  # Opção 2: Separado
  npm run dev              # Terminal 1 (React)
  npm run dev:python       # Terminal 2 (Python)
  ```

📖 **Documentação completa:**
- `EXPORTACAO_COMPLETA_README.md` - Guia detalhado
- `INSTALACAO_PYTHON_XLSX.md` - Instalação passo a passo
- `GUIA_RAPIDO_EXPORTACAO.md` - Referência rápida

### 📊 Dashboard

- Cards com estatísticas principais

- Gráficos de horas por projeto  - Projetos ativos   DB_PORT=5432

- Lista de projetos com progresso visual

- Navegação rápida para funcionalidades  - Empresas cadastradas   DB_NAME=seu-banco



### 📁 Gerenciamento de Projetos- Gráficos de horas por projeto   DB_USER=seu-usuario

- Listagem de todos os projetos

- Criação, edição e exclusão de projetos- Lista de projetos com progresso visual   DB_PASSWORD=sua-senha

- Vinculação de projetos a empresas

- Status do projeto (ativo/inativo)- Navegação rápida para funcionalidades   DB_SSL=true



### 🏢 Gerenciamento de Empresas (Admin)

- CRUD completo de empresas

- Vinculação com projetos### 📁 Gerenciamento de Projetos   # Configurações do Supabase

- Ativação/desativação

- Exclusão em cascata- Listagem de todos os projetos   SUPABASE_URL=https://seu-projeto.supabase.co



### 👥 Painel Administrativo- Criação, edição e exclusão de projetos   SUPABASE_ANON_KEY=sua-chave-publica-supabase

- Gerenciamento de funcionários

- Aprovação/rejeição de pontos- Vinculação de projetos a empresas

- Estatísticas gerenciais

- Notificações de aprovações pendentes- Status do projeto (ativo/inativo)   # Configurações do Servidor



### 📜 Histórico e Relatórios- Visualização de horas trabalhadas por projeto   PORT=3001

- Visualização de todos os registros

- Filtros por data e projeto   NODE_ENV=development

- **Exportação de relatórios em PDF** com:

  - Dados detalhados de entrada/saída### 🏢 Gerenciamento de Empresas (Admin)

  - Cálculo de horas trabalhadas

  - Saldo de horas- Interface tabbed (Funcionários | Empresas)   # Configurações da API Frontend

  - Gráficos visuais (opcional)

- Edição e exclusão de registros- CRUD completo de empresas:   VITE_API_BASE_URL=http://localhost:3001/api



## 📦 Instalação e Configuração  - Nome, CNPJ (com máscara), Endereço, Telefone, Email   VITE_SUPABASE_URL=https://seu-projeto.supabase.co



### 1. Clone o repositório  - Ativação/desativação de empresas   VITE_SUPABASE_ANON_KEY=sua-chave-publica-supabase

```bash

git clone https://github.com/yAndreL/YourTime-React.git  - Exclusão com confirmação   ```

cd YourTime-React

```- Layout em cards responsivo



### 2. Instale as dependências- Toasts de notificação coloridos:5. **Inicie o projeto**

```bash

npm install  - ✅ Verde: Criação, atualização, ativação   ```bash

```

  - ⚠️ Amarelo: Desativação   # Iniciar frontend e backend simultaneamente

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:  - ❌ Vermelho: Exclusão   npm run dev:full



```env- Modal de confirmação vermelha para exclusões

# Configurações do Supabase

VITE_SUPABASE_URL=https://seu-projeto.supabase.co- Exclusão em cascata (remove projetos vinculados)   # Ou executar separadamente:

VITE_SUPABASE_ANON_KEY=sua-chave-publica-supabase

```   npm run dev      # Frontend (Vite)



### 4. Configure o banco de dados no Supabase### 👥 Painel Administrativo (Admin)   npm run server   # Backend (Express)



Execute os seguintes scripts SQL no SQL Editor do Supabase:- Gerenciamento de funcionários:   ```



#### a) Criar tabela de configurações  - Cadastro de novos usuários

```sql

-- Execute o arquivo CREATE_TABLE_CONFIGURACOES.sql  - Atribuição de cargos## 📁 Estrutura do Projeto

```

  - Filtros por status (ativo/inativo)

#### b) Criar tabela de notificações

```sql  - Busca por nome, email, cargo, departamento```

-- Execute o arquivo CREATE_TABLE_NOTIFICATIONS.sql

```  - Visualização de pontos do diaYourTime-React/



#### c) Configurar outras tabelas necessárias  - Aprovação/rejeição de registros├── backend/           # API Express

- Tabela `profiles` (perfis de usuário)

- Tabela `empresas` (empresas)- Estatísticas gerenciais:│   ├── controllers/   # Controladores da API

- Tabela `projetos` (projetos)

- Tabela `agendamento` (registros de ponto)  - Total de funcionários│   ├── routes/        # Rotas da API

- Tabela `cargos` (cargos dinâmicos)

  - Pontos aprovados│   └── services/      # Serviços (banco de dados)

> **Nota**: Consulte a seção de banco de dados abaixo para mais detalhes.

  - Pontos pendentes├── src/              # Frontend React

### 5. Inicie o servidor de desenvolvimento

```bash  - Funcionários sem registro│   ├── components/   # Componentes React

npm run dev

```- Tabela completa com informações detalhadas│   ├── config/       # Configurações (Supabase)



O aplicativo estará disponível em `http://localhost:5174`│   ├── constants/    # Constantes da aplicação



## 🗄️ Estrutura do Banco de Dados### 📜 Histórico de Apontamentos│   ├── hooks/        # Custom hooks



### Tabelas Principais- Visualização de todos os registros de ponto│   ├── services/     # Serviços do frontend



#### `profiles`- Filtros por data e projeto│   └── views/        # Páginas/Views

- Dados dos usuários (nome, email, telefone, cargo, avatar)

- Campo `role`: 'admin' ou 'user'- Exportação de relatórios├── .env              # Variáveis de ambiente (não versionado)

- Vinculação com `auth.users` do Supabase

- Edição e exclusão de registros├── .env.example      # Exemplo de configuração

#### `configuracoes` ✨ NOVO!

- Configurações personalizadas por usuário└── server.js         # Servidor Express principal

- Lembretes, horários de trabalho, preferências de relatório

- Criação automática ao cadastrar novo usuário### ⚙️ Configurações```



#### `notificacoes` ✨ NOVO!- Personalização de preferências

- Notificações in-app para cada usuário

- Tipos: ponto, aprovação, lembrete, sistema- Gerenciamento de notificações## 🔧 Scripts Disponíveis

- Suporte para realtime subscriptions

- Configurações de privacidade

#### `cargos`

- Gerenciamento dinâmico de cargos### Desenvolvimento

- Níveis de acesso (admin/user)

## 🗄️ Estrutura do Banco de Dados- `npm run setup` - Setup automático do ambiente

#### `empresas`

- Cadastro de empresas- `npm run setup:dev` - Setup rápido para desenvolvimento  

- Status ativo/inativo

### Tabelas Principais- `npm run dev` - Inicia o frontend em modo desenvolvimento

#### `projetos`

- Projetos vinculados a empresas- `npm run server` - Inicia apenas o servidor backend

- Foreign Key com CASCADE DELETE

#### `profiles`- `npm run dev:full` - Inicia frontend + backend simultaneamente

#### `agendamento`

- Registros de ponto dos usuários- Dados dos usuários (nome, email, telefone, cargo, avatar)

- Horários de entrada/saída (2 turnos)

- Status de aprovação- Campo `role`: 'admin' ou 'user'### Produção



### Políticas RLS- Relação com `auth.users`- `npm run setup:prod` - Setup para produção



Todas as tabelas possuem Row Level Security habilitado:- `npm run build` - Gera build de produção

- Usuários só veem seus próprios dados

- Admins têm acesso completo#### `cargos`- `npm run preview` - Preview do build de produção

- Notificações são privadas por usuário

- Gerenciamento dinâmico de cargos

## 🎨 Interface e UX

- `nivel_acesso`: 'admin' ou 'user'### Utilitários

- Design System consistente

- Componentes reutilizáveis- Descrição e status (ativo/inativo)- `npm run lint` - Executa o linter ESLint

- Layout responsivo (mobile-first)

- Sidebar fixa com navegação intuitiva

- Sistema de notificações (Toasts)

- Modais informativos#### `empresas`## 🗄️ Banco de Dados

- Animações suaves

- Cadastro de empresas

## 🔒 Segurança

- Dados: nome, CNPJ, endereço, telefone, emailO projeto utiliza PostgreSQL através do Supabase. Para configurar sua própria instância:

- ✅ Autenticação via Supabase Auth

- ✅ Row Level Security (RLS) em todas as tabelas- Status ativo/inativo

- ✅ Validação de permissões no frontend e backend

- ✅ Proteção de rotas sensíveis- Políticas RLS para controle de acesso1. Crie uma conta no [Supabase](https://supabase.com)

- ✅ Foreign Keys com restrições adequadas

- ✅ Hashing de senhas automático pelo Supabase2. Crie um novo projeto

- ✅ HTTPS obrigatório em produção

#### `projetos`3. Copie a URL e a chave pública do projeto

## 📱 Responsividade

- Projetos vinculados a empresas4. Atualize o arquivo `.env` com suas credenciais

- ✅ Mobile First Design

- ✅ Breakpoints Tailwind (sm, md, lg, xl, 2xl)- Foreign Key com CASCADE DELETE

- ✅ Sidebar colapsável em telas pequenas

- ✅ Cards adaptáveis em grid- Carga horária e datas de início/fim## 🌐 Deploy

- ✅ Formulários otimizados para touch



## 🧪 Testes

#### `agendamento`### Para Produção

```bash

npm run test- Registros de ponto dos usuários

```

- Horários de entrada/saída (2 turnos)1. Configure as variáveis de ambiente para produção

## 📦 Build para Produção

- Vinculação com projetos e usuários2. Atualize `VITE_API_BASE_URL` para a URL do seu servidor

```bash

npm run build- Descrição das atividades realizadas3. Execute o build:

```

   ```bash

Os arquivos otimizados estarão na pasta `dist/`

### Políticas RLS (Row Level Security)   npm run build

## 🚀 Deploy

   ```

### Vercel

```bash#### Empresas

vercel --prod

```- **SELECT**: Todos usuários autenticados podem visualizar### Variáveis de Ambiente para Produção



### Netlify- **INSERT/UPDATE/DELETE**: Apenas admins

```bash

netlify deploy --prod```env

```

#### ProfilesNODE_ENV=production

### Variáveis de Ambiente para Produção

```env- **SELECT**: Usuários podem ver todos os perfisVITE_API_BASE_URL=https://seu-dominio.com/api

VITE_SUPABASE_URL=https://seu-projeto.supabase.co

VITE_SUPABASE_ANON_KEY=sua-chave-publica- **UPDATE**: Usuários podem atualizar apenas seu próprio perfilVITE_SUPABASE_URL=https://seu-projeto.supabase.co

NODE_ENV=production

```- **INSERT**: Apenas admins podem criar novos perfisVITE_SUPABASE_ANON_KEY=sua-chave-publica



## 🆕 Novas Funcionalidades (v2.0)```



### Sistema de Notificações Completo## 🎨 Interface e UX

- Notificações in-app em tempo real

- Sino no header com contador## 🔒 Segurança

- Lembretes automáticos inteligentes

- Emails automáticos (via Edge Functions)### Design System

- Notificações para admins de aprovações pendentes

- Paleta de cores consistente### ⚠️ Configurações Importantes

### Configurações Personalizadas

- Configurações salvas por usuário no banco- Componentes reutilizáveis- **Nunca** commit o arquivo `.env` no controle de versão

- Personalização de horários e preferências

- Controle total sobre notificações e relatórios- Layout responsivo (mobile-first)- Use sempre variáveis de ambiente para credenciais sensíveis



### Melhorias no Sistema de Relatórios- Sidebar fixa com navegação intuitiva- Para o frontend (Vite), use o prefixo `VITE_` apenas para variáveis não sensíveis

- Opção de incluir gráficos em PDFs

- Formato de exportação configurável- Sistema de notificações (Toasts):- Mantenha as chaves do Supabase seguras e não as exponha em repositórios públicos

- Relatórios mais detalhados

  - Posicionamento: canto inferior direito

## 🐛 Solução de Problemas

  - Animação de entrada (slide)### 🏠 Ambientes Diferentes

Para códigos de erro e soluções, consulte o arquivo `CODIGOS_ERRO.md`.

  - Auto-dismiss após 3-5 segundos- `.env` - Arquivo principal (não versionado)

### Problemas Comuns

  - Botão de fechar manual- `.env.example` - Template para novos desenvolvedores  

**Erro de conexão com Supabase**

- Verifique suas credenciais no `.env`- `.env.development` - Configurações de desenvolvimento

- Confirme que o projeto Supabase está ativo

- Teste a conexão no SQL Editor### Componentes Principais- `.env.production` - Template para produção



**Notificações não aparecem**- **Modal**: Sistema de modais reutilizável com tipos (success, error, warning, info, delete)

- Execute os scripts SQL de criação das tabelas

- Verifique as políticas RLS no Supabase- **Toast**: Notificações não-intrusivas### 🛡️ Boas Práticas

- Confirme que o realtime está habilitado

- **ProtectedRoute**: Wrapper para proteção de rotas1. Use senhas fortes para o banco de dados

**Lembretes não funcionam**

- Verifique se os lembretes estão habilitados nas configurações- **MainLayout**: Layout padrão com Sidebar2. Ative autenticação de dois fatores no Supabase

- Confirme os horários de entrada/saída configurados

- Edge Functions devem estar configuradas para emails- **DashboardCards**: Cards informativos do dashboard3. Configure RLS (Row Level Security) nas tabelas do Supabase



## 📝 Licença- **Sidebar**: Navegação lateral com itens condicionais por role4. Use HTTPS em produção



Este projeto está sob a licença MIT.5. Monitore logs de acesso e erro



## 👨‍💻 Autor### Componentes de Formulário



**André Luiz**- **CadastroUser**: Cadastro de funcionários com seleção dinâmica de cargos## 🐛 Solução de Problemas

- GitHub: [@yAndreL](https://github.com/yAndreL)

- **FormularioPonto**: Registro de horas trabalhadas

## 🤝 Contribuindo

- **EsqueciSenha**: Recuperação de senha### Erro de Conexão com Banco

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto- Verifique se as credenciais no `.env` estão corretas

2. Criar uma branch para sua feature (`git checkout -b feature/AmazingFeature`)

3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)## 📦 Instalação e Configuração- Confirme se o Supabase está acessível

4. Push para a branch (`git push origin feature/AmazingFeature`)

5. Abrir um Pull Request- Teste a conexão através da interface do sistema



## 📞 Suporte### 1. Clone o repositório



Para suporte, envie um email para andreluis@example.com ou abra uma issue no GitHub.```bash### Porta em Uso



---git clone https://github.com/yAndreL/YourTime-React.git- Altere a variável `PORT` no arquivo `.env`



Desenvolvido com ❤️ por André Luizcd YourTime-React- Ou termine os processos que estão usando a porta 3001


```

## 🤝 Contribuição

### 2. Instale as dependências

```bash1. Fork o projeto

npm install2. Crie uma branch para sua feature

```3. Commit suas mudanças

4. Push para a branch

### 3. Configure as variáveis de ambiente5. Abra um Pull Request

Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 4. Configure o Supabase

#### a) Crie as tabelas
Execute os seguintes comandos SQL no SQL Editor do Supabase:

**Tabela de Cargos:**
```sql
CREATE TABLE cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) UNIQUE NOT NULL,
  nivel_acesso VARCHAR(20) CHECK (nivel_acesso IN ('admin', 'user')) NOT NULL,
  descricao TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir cargos padrão
INSERT INTO cargos (nome, nivel_acesso, descricao) VALUES
('Admin', 'admin', 'Administrador do sistema'),
('Gerente', 'admin', 'Gerente de projetos'),
('Desenvolvedor', 'user', 'Desenvolvedor de software'),
('Designer', 'user', 'Designer UX/UI'),
('Analista', 'user', 'Analista de sistemas');
```

**Tabela de Empresas:**
```sql
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Atualizar Profiles para usar FK:**
```sql
ALTER TABLE profiles 
ADD CONSTRAINT profiles_cargo_fkey 
FOREIGN KEY (cargo) 
REFERENCES cargos(nome) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;
```

**Atualizar Projetos para CASCADE:**
```sql
ALTER TABLE projetos 
DROP CONSTRAINT IF EXISTS projetos_empresa_id_fkey;

ALTER TABLE projetos 
ADD CONSTRAINT projetos_empresa_id_fkey 
FOREIGN KEY (empresa_id) 
REFERENCES empresas(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;
```

#### b) Configure as Políticas RLS

**Para Empresas:**
```sql
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Visualização para todos autenticados
CREATE POLICY "Permitir visualização de empresas"
ON empresas FOR SELECT
TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE apenas para admins
CREATE POLICY "Permitir gerenciamento de empresas para admins"
ON empresas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Para Cargos:**
```sql
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;

-- Visualização para todos autenticados
CREATE POLICY "Permitir visualização de cargos"
ON cargos FOR SELECT
TO authenticated
USING (true);

-- Gerenciamento apenas para admins
CREATE POLICY "Permitir gerenciamento de cargos para admins"
ON cargos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

#### c) Desabilite confirmação de email (opcional)
```sql
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_confirm_user_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auto_confirm_user();
```

#### d) Configure o Storage para avatares
No Supabase Dashboard > Storage:
1. Crie um bucket chamado `avatars`
2. Torne-o público
3. Configure políticas de acesso

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

## 🔒 Segurança

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Validação de permissões no frontend e backend
- ✅ Proteção de rotas sensíveis
- ✅ Foreign Keys com restrições adequadas
- ✅ SessionStorage para cache de role (melhor performance)
- ✅ Hashing de senhas automático pelo Supabase

## 📱 Responsividade

- ✅ Mobile First Design
- ✅ Breakpoints Tailwind (sm, md, lg, xl, 2xl)
- ✅ Sidebar colapsável em telas pequenas
- ✅ Cards adaptáveis em grid
- ✅ Formulários otimizados para touch
- ✅ Modais centralizados e scrollable

## 🧪 Testes

```bash
npm run test
```

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos otimizados estarão na pasta `dist/`

## 🚀 Deploy

### Vercel
```bash
vercel --prod
```

### Netlify
```bash
netlify deploy --prod
```

## 📝 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Autor

**André Luiz**
- GitHub: [@yAndreL](https://github.com/yAndreL)

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abrir um Pull Request

## 📞 Suporte

Para suporte, envie um email para andreluis@example.com ou abra uma issue no GitHub.

---

Desenvolvido com ❤️ por André Luiz
