# 📋 Códigos de Erro do Sistema YourTime

## 🔴 Erros de Autenticação (AUTH-XXX)

### AUTH-001
**Descrição:** Credenciais inválidas  
**Causa:** Email ou senha incorretos no login  
**Solução:** Verificar email e senha digitados

### AUTH-002
**Descrição:** Sessão expirada  
**Causa:** Token de autenticação expirado  
**Solução:** Fazer login novamente

### AUTH-003
**Descrição:** Usuário não autenticado  
**Causa:** Tentativa de acessar área protegida sem login  
**Solução:** Realizar login no sistema

### AUTH-004
**Descrição:** Permissão insuficiente  
**Causa:** Usuário sem permissão para acessar recurso  
**Solução:** Contatar administrador para liberação de acesso

### AUTH-005
**Descrição:** Email não confirmado  
**Causa:** Email ainda não foi verificado  
**Solução:** Verificar caixa de entrada e confirmar email

---

## 🟠 Erros de Cadastro (CAD-XXX)

### CAD-001
**Descrição:** Email já cadastrado  
**Causa:** Tentativa de cadastrar email já existente  
**Solução:** Usar outro email ou recuperar senha

### CAD-002
**Descrição:** Senha fraca  
**Causa:** Senha não atende requisitos mínimos  
**Solução:** Usar senha com pelo menos 6 caracteres

### CAD-003
**Descrição:** Senhas não conferem  
**Causa:** Senha e confirmação diferentes  
**Solução:** Digitar a mesma senha nos dois campos

### CAD-004
**Descrição:** Dados obrigatórios não preenchidos  
**Causa:** Campos obrigatórios vazios  
**Solução:** Preencher todos os campos marcados com *

### CAD-005
**Descrição:** CPF/CNPJ inválido  
**Causa:** Formato de documento incorreto  
**Solução:** Verificar e corrigir o número do documento

### CAD-006
**Descrição:** Nenhuma empresa selecionada  
**Causa:** Funcionário deve estar vinculado a pelo menos uma empresa  
**Solução:** Selecionar uma ou mais empresas

---

## 🟡 Erros de Ponto (PONTO-XXX)

### PONTO-001
**Descrição:** Horário inválido  
**Causa:** Horário de saída anterior ao de entrada  
**Solução:** Verificar sequência correta dos horários

### PONTO-002
**Descrição:** Ponto já registrado  
**Causa:** Já existe ponto registrado para esta data  
**Solução:** Editar o ponto existente ao invés de criar novo

### PONTO-003
**Descrição:** Intervalo insuficiente  
**Causa:** Tempo entre entrada2 e saída1 menor que mínimo  
**Solução:** Respeitar intervalo mínimo de 1 hora

### PONTO-004
**Descrição:** Projeto não selecionado  
**Causa:** Tentativa de registrar ponto sem projeto  
**Solução:** Selecionar um projeto antes de salvar

### PONTO-005
**Descrição:** Data futura  
**Causa:** Tentativa de registrar ponto em data futura  
**Solução:** Usar data atual ou passada

### PONTO-006
**Descrição:** Horas excedidas  
**Causa:** Total de horas do dia excede limite permitido  
**Solução:** Verificar horários registrados (máximo 12h/dia)

---

## 🟢 Erros de Projeto (PROJ-XXX)

### PROJ-001
**Descrição:** Projeto não encontrado  
**Causa:** ID do projeto inválido ou projeto excluído  
**Solução:** Selecionar um projeto válido

### PROJ-002
**Descrição:** Nome de projeto duplicado  
**Causa:** Já existe projeto com este nome  
**Solução:** Usar nome único para o projeto

### PROJ-003
**Descrição:** Horas estimadas inválidas  
**Causa:** Valor de horas estimadas menor ou igual a zero  
**Solução:** Definir horas estimadas maior que zero

### PROJ-004
**Descrição:** Projeto sem empresa  
**Causa:** Projeto deve estar vinculado a uma empresa  
**Solução:** Vincular projeto a uma empresa existente

### PROJ-005
**Descrição:** Data de entrega passada  
**Causa:** Tentativa de criar projeto com prazo vencido  
**Solução:** Definir data de entrega futura

---

## 🔵 Erros de Painel Admin (PA-XXX)

### PA-001
**Descrição:** Erro ao aprovar ponto  
**Causa:** Falha ao atualizar status do ponto para aprovado  
**Solução:** Verificar conexão e tentar novamente

### PA-002
**Descrição:** Erro ao desaprovar ponto  
**Causa:** Falha ao atualizar status do ponto para rejeitado  
**Solução:** Verificar conexão e tentar novamente

### PA-003
**Descrição:** Erro ao carregar funcionários  
**Causa:** Falha na consulta de funcionários  
**Solução:** Recarregar página

### PA-004
**Descrição:** Erro ao excluir funcionário  
**Causa:** Falha ao remover funcionário do sistema  
**Solução:** Verificar se funcionário não tem pontos registrados

### PA-005
**Descrição:** Erro ao carregar pontos pendentes  
**Causa:** Falha ao buscar dias com pontos pendentes  
**Solução:** Verificar conexão com banco de dados

---

## 🟣 Erros de Empresa (EMP-XXX)

### EMP-001
**Descrição:** CNPJ inválido  
**Causa:** Formato de CNPJ incorreto  
**Solução:** Verificar CNPJ (formato: XX.XXX.XXX/XXXX-XX)

### EMP-002
**Descrição:** Empresa já cadastrada  
**Causa:** CNPJ já existe no sistema  
**Solução:** Usar CNPJ diferente ou editar empresa existente

### EMP-003
**Descrição:** Nome de empresa vazio  
**Causa:** Campo nome não preenchido  
**Solução:** Preencher nome da empresa

### EMP-004
**Descrição:** Erro ao desativar empresa  
**Causa:** Falha ao inativar empresa  
**Solução:** Verificar se empresa não tem projetos ativos

---

## ⚫ Erros de Banco de Dados (DB-XXX)

### DB-001
**Descrição:** Erro de conexão  
**Causa:** Falha ao conectar com Supabase  
**Solução:** Verificar internet e status do Supabase

### DB-002
**Descrição:** Timeout  
**Causa:** Consulta demorou muito para responder  
**Solução:** Tentar novamente em alguns segundos

### DB-003
**Descrição:** RLS violation  
**Causa:** Row Level Security bloqueou operação  
**Solução:** Verificar permissões do usuário

### DB-004
**Descrição:** Foreign key constraint  
**Causa:** Tentativa de deletar registro com dependências  
**Solução:** Remover dependências antes de deletar

### DB-005
**Descrição:** Unique constraint  
**Causa:** Tentativa de inserir valor duplicado em campo único  
**Solução:** Usar valor diferente

---

## 🟤 Erros de Exportação (EXP-XXX)

### EXP-001
**Descrição:** Nenhum funcionário selecionado  
**Causa:** Tentativa de gerar PDF sem selecionar funcionários  
**Solução:** Selecionar pelo menos um funcionário

### EXP-002
**Descrição:** Período não selecionado  
**Causa:** Datas início ou fim não informadas  
**Solução:** Preencher data início e data fim

### EXP-003
**Descrição:** Período inválido  
**Causa:** Data início posterior à data fim  
**Solução:** Verificar ordem das datas

### EXP-004
**Descrição:** Erro ao gerar relatório  
**Causa:** Falha geral na geração do PDF  
**Solução:** Verificar conexão e tentar novamente

### EXP-005
**Descrição:** Sem registros no período  
**Causa:** Nenhum ponto registrado no período selecionado  
**Solução:** Selecionar período com registros ou registrar pontos

### EXP-006
**Descrição:** Erro de formatação  
**Causa:** Falha ao formatar o PDF  
**Solução:** Recarregar página e tentar novamente

---

## ⚪ Erros Gerais (SYS-XXX)

### SYS-001
**Descrição:** Erro inesperado  
**Causa:** Erro não mapeado no sistema  
**Solução:** Recarregar página e tentar novamente

### SYS-002
**Descrição:** Recurso não encontrado  
**Causa:** URL ou recurso inválido  
**Solução:** Verificar navegação

### SYS-003
**Descrição:** Sessão inválida  
**Causa:** Dados de sessão corrompidos  
**Solução:** Limpar cache e fazer login novamente

### SYS-004
**Descrição:** Upload falhou  
**Causa:** Erro ao enviar arquivo  
**Solução:** Verificar tamanho e formato do arquivo

### SYS-005
**Descrição:** Validação falhou  
**Causa:** Dados enviados não passaram na validação  
**Solução:** Verificar campos preenchidos corretamente

---

## 📊 Como Usar Este Guia

1. **Identifique o código**: Procure o código de erro exibido na tela
2. **Leia a descrição**: Entenda o que causou o erro
3. **Aplique a solução**: Siga as instruções para resolver
4. **Persiste o erro?**: Entre em contato com o suporte

## 🆘 Suporte

Se o erro persistir após seguir as soluções:
- 📧 Email: suporte@yourtime.com
- 💬 Chat: Disponível no sistema
- 📞 Telefone: (11) 9999-9999

---

**Última atualização:** Novembro 2025  
**Versão do documento:** 1.0
