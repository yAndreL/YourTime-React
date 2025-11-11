# YourTime ⏰

Sistema completo de gestão de tempo e registro de ponto para empresas, desenvolvido com React e Supabase.

> **Controle total sobre as horas trabalhadas da sua equipe com inteligência, automação e relatórios visuais.**

---

## 🎯 Para que serve?

O **YourTime** é uma solução moderna e completa para empresas que precisam:

- ✅ Registrar e controlar horas trabalhadas dos funcionários
- ✅ Gerenciar múltiplos projetos e empresas
- ✅ Aprovar/rejeitar apontamentos de horas
- ✅ Receber lembretes automáticos de registro de ponto
- ✅ Exportar relatórios profissionais (PDF, Excel, CSV)
- ✅ Visualizar estatísticas e gráficos em tempo real
- ✅ Configurar preferências personalizadas por usuário

---

## ⚡ Funcionalidades Principais

### 🔐 Autenticação e Permissões
- Sistema de login seguro com Supabase Auth
- **Recuperação de senha** por email com código de verificação
- Dois níveis de acesso: **Admin** e **Usuário**
- Proteção de rotas por autenticação e role
- Sistema de cargos dinâmico
- Row Level Security (RLS) no banco de dados

### 👤 Perfil de Usuário
- Visualização e edição de dados pessoais
- Upload de foto de perfil (avatar)
- Estatísticas pessoais (horas trabalhadas, projetos, média diária)
- Histórico completo de atividades

### ⏱️ Registro de Ponto
- Formulário intuitivo para registro de horas
- Seleção de projeto vinculado
- Campos de entrada/saída com 2 turnos (manhã/tarde)
- **Cálculo automático de horas trabalhadas**
- Status de aprovação: Pendente, Aprovado, Rejeitado
- Edição e exclusão de registros

### 🔔 Sistema de Notificações em Tempo Real
- **Notificações In-App** com Supabase Realtime
- Sino no header com badge de contagem
- Tipos de notificações:
  - ✅ Pontos registrados
  - 👍 Pontos aprovados/rejeitados
  - ⏰ Lembretes automáticos de registro
  - ⏳ Aprovações pendentes (para admins)
- **Lembretes Automáticos Inteligentes**:
  - Horário de entrada
  - Horário de intervalo (saída e retorno)
  - 15 minutos antes da saída
  - Horário de saída
- Marcar como lidas individualmente ou em massa
- Deletar notificações

### ⚙️ Configurações Personalizadas
- **Configurações salvas no banco** por usuário
- **Notificações**:
  - Habilitar/desabilitar email de relatórios semanais
  - Habilitar/desabilitar lembretes de ponto
- **Jornada de Trabalho**:
  - Horário de entrada padrão
  - Horário de saída padrão
  - Horas semanais esperadas
  - Fuso horário personalizado
- **Relatórios**:
  - Formato de exportação padrão (PDF, Excel, CSV)
  - Incluir/excluir gráficos em PDFs
- 🔄 Restaurar configurações padrão com um clique

### 📤 Exportação de Dados Profissional

#### 📄 CSV - Dados Brutos
- Exportação simples e rápida
- Arquivo leve para integração com outros sistemas
- Formato universal (Excel, Google Sheets, etc.)

#### 📊 XLSX - Relatório Visual com Gráficos
- **Relatório formatado automaticamente:**
  - 🎨 Tabelas com cores e bordas profissionais
  - 📈 Gráfico de Pizza (distribuição por status)
  - 📊 Gráfico de Barras Empilhadas (horas por dia)
  - 🎯 Formatação condicional por status:
    - 🟢 Verde = Aprovado
    - 🟡 Amarelo = Pendente
    - 🔴 Vermelho = Rejeitado
  
- **Estrutura completa:**
  1. Dados do Funcionário
  2. Estatísticas do Período
  3. Gráfico de Distribuição por Status
  4. Gráfico de Horas por Dia
  5. Tabela Detalhada de Registros

#### 📄 PDF - Relatórios Personalizados
- Dados detalhados de entrada/saída
- Cálculo de horas trabalhadas
- Saldo de horas (extras/devidas)
- Gráficos visuais opcionais

### 📊 Dashboard Interativo
- Cards com estatísticas principais
- Gráficos de horas por projeto
- Lista de projetos com progresso visual
- Navegação rápida para funcionalidades

### 📁 Gerenciamento de Projetos
- Listagem completa de projetos
- Criação, edição e exclusão
- Vinculação de projetos a empresas
- Status (ativo/inativo)
- Carga horária e datas de início/fim

### 🏢 Gerenciamento de Empresas (Admin)
- **CRUD completo de empresas**
- Dados: nome, CNPJ, endereço, telefone, email
- Vinculação com projetos
- Ativação/desativação
- **Exclusão em cascata** (remove projetos vinculados)
- Modal de confirmação para exclusões
- Toasts coloridos para feedback

### 👥 Painel Administrativo
- **Gerenciamento de funcionários:**
  - Cadastro de novos usuários
  - Atribuição de cargos
  - Filtros por status (ativo/inativo)
  - Busca por nome, email, cargo, departamento
- **Aprovação/rejeição de pontos:**
  - Visualização de pontos do dia
  - Aprovação/rejeição em lote
- **Estatísticas gerenciais:**
  - Total de funcionários
  - Pontos aprovados/pendentes
  - Funcionários sem registro

### 📜 Histórico de Apontamentos
- Visualização completa de registros
- Filtros por data e projeto
- Edição e exclusão de registros
- Exportação em múltiplos formatos

---

## 🚀 Tecnologias

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Estilização**: Tailwind CSS
- **Ícones**: React Icons (Feather Icons)
- **Roteamento**: React Router DOM
- **Relatórios**: jsPDF, autoTable
- **Email**: Resend API (via Supabase Edge Functions)

---

## 🎨 Interface e Experiência

- 📱 **Design Mobile-First** totalmente responsivo
- 🎨 **Design System** consistente
- 🧩 **Componentes reutilizáveis**
- 📐 **Layout adaptável** com Sidebar colapsável
- 🔔 **Sistema de Toasts** não-intrusivos
- 🪟 **Modais informativos** com tipos (success, error, warning, info)
- ⚡ **Animações suaves** e transições

---

## 🔒 Segurança

- ✅ Autenticação via Supabase Auth
- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Validação de permissões no frontend e backend
- ✅ Proteção de rotas sensíveis
- ✅ Foreign Keys com restrições adequadas
- ✅ Hashing de senhas automático
- ✅ HTTPS obrigatório em produção

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 👨‍💻 Autor

**André Luiz**  
GitHub: [@yAndreL](https://github.com/yAndreL)

---

## ⭐ Gostou do projeto?

Se este projeto foi útil para você, considere dar uma ⭐ no repositório!

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Para contribuir:

1. 🍴 **Faça um fork** do projeto
2. 🌿 **Crie uma branch** para sua feature (`git checkout -b feature/MinhaFeature`)
3. 💾 **Commit suas mudanças** (`git commit -m 'Adiciona MinhaFeature'`)
4. 📤 **Push para a branch** (`git push origin feature/MinhaFeature`)
5. 🔃 **Abra um Pull Request**

---

## 📞 Suporte

Para suporte, abra uma **issue** no GitHub ou entre em contato através do perfil.

---

**Desenvolvido com ❤️ por André Luiz**
