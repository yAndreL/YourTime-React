# 📋 Guia de Erros - YourTime

Sistema de registro e gestão de horas de trabalho.

---

## 🔐 Autenticação (AUTH)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **AUTH-001** | Credenciais inválidas | Email ou senha incorretos | Verificar dados e tentar novamente |
| **AUTH-002** | Sessão expirada | Token de autenticação vencido | Fazer login novamente |
| **AUTH-003** | Acesso negado | Sem autenticação ou permissão | Fazer login com conta autorizada |
| **AUTH-004** | Email não confirmado | Email ainda não verificado | Confirmar email pelo link recebido |

---

## � Cadastro de Usuários (CAD)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **CAD-001** | Email já cadastrado | Email duplicado no sistema | Usar outro email ou recuperar senha |
| **CAD-002** | Senha fraca | Senha com menos de 6 caracteres | Usar senha mais forte (min. 6 caracteres) |
| **CAD-003** | Senhas não conferem | Senha e confirmação diferentes | Digitar a mesma senha nos dois campos |
| **CAD-004** | Campos obrigatórios vazios | Dados necessários não preenchidos | Preencher todos os campos marcados com * |
| **CAD-005** | Telefone inválido | Formato incorreto | Usar formato: (XX) 9XXXX-XXXX |
| **CAD-006** | Nenhuma empresa selecionada | Funcionário sem vínculo | Selecionar pelo menos uma empresa |
| **CAD-007** | Erro ao cadastrar usuário | Falha no banco de dados | Contatar suporte técnico |

---

## ⏰ Registro de Ponto (PONTO)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **PONTO-001** | Horário inválido | Saída antes da entrada | Verificar ordem dos horários |
| **PONTO-002** | Ponto já registrado | Registro duplicado na data | Editar registro existente |
| **PONTO-003** | Intervalo insuficiente | Pausa menor que 1 hora | Respeitar intervalo mínimo (1h) |
| **PONTO-004** | Projeto não selecionado | Falta vincular a projeto | Selecionar projeto antes de salvar |
| **PONTO-005** | Data futura | Tentativa de registro futuro | Usar data atual ou passada |
| **PONTO-006** | Limite de horas excedido | Mais de 12 horas no dia | Ajustar horários (máx. 12h/dia) |

---

## � Projetos (PROJ)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **PROJ-001** | Projeto não encontrado | ID inválido ou excluído | Selecionar projeto válido |
| **PROJ-002** | Nome duplicado | Projeto com mesmo nome existe | Usar nome único |
| **PROJ-003** | Horas estimadas inválidas | Valor zero ou negativo | Definir horas estimadas > 0 |
| **PROJ-004** | Projeto sem empresa | Falta vínculo com empresa | Vincular a empresa existente |
| **PROJ-005** | Prazo vencido | Data de entrega no passado | Definir data futura |

---

## 🏢 Empresas (EMP)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **EMP-001** | CNPJ inválido | Formato incorreto | Usar formato: XX.XXX.XXX/XXXX-XX |
| **EMP-002** | CNPJ já cadastrado | Empresa duplicada | Editar empresa existente |
| **EMP-003** | Nome vazio | Campo obrigatório não preenchido | Informar nome da empresa |
| **EMP-004** | Erro ao desativar | Empresa tem projetos ativos | Finalizar projetos antes |

---

## 👨‍� Painel Admin (PA)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **PA-001** | Erro ao aprovar ponto | Falha na atualização | Verificar conexão e tentar novamente |
| **PA-002** | Erro ao desaprovar ponto | Falha na atualização | Verificar conexão e tentar novamente |
| **PA-003** | Erro ao carregar funcionários | Falha na consulta | Recarregar página |
| **PA-004** | Erro ao excluir funcionário | Funcionário tem registros | Remover registros antes de excluir |
| **PA-005** | Erro ao carregar pontos | Falha no banco de dados | Verificar conexão |

---

## � Exportação (EXP)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **EXP-001** | Nenhum funcionário selecionado | Seleção vazia | Selecionar pelo menos um funcionário |
| **EXP-002** | Período não informado | Datas faltando | Preencher data início e fim |
| **EXP-003** | Período inválido | Data início > data fim | Corrigir ordem das datas |
| **EXP-004** | Erro ao gerar PDF | Falha no processamento | Tentar novamente |
| **EXP-005** | Sem registros | Período sem dados | Escolher período com registros |

---

## 🔄 Recuperação de Senha (RESET)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **RESET-001** | Email não encontrado | Email não cadastrado | Verificar email ou cadastrar-se |
| **RESET-002** | Código inválido | Código errado ou expirado | Digitar código correto ou reenviar |
| **RESET-003** | Código expirado | Tempo limite excedido | Solicitar novo código |
| **RESET-004** | Erro ao enviar email | Falha no serviço de email | Tentar novamente em alguns minutos |
| **RESET-005** | Senha igual à anterior | Nova senha = senha atual | Usar senha diferente |

---

## 💾 Banco de Dados (DB)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **DB-001** | Erro de conexão | Sem conexão com Supabase | Verificar internet |
| **DB-002** | Timeout | Consulta muito lenta | Tentar novamente |
| **DB-003** | RLS violation | Permissão negada pelo RLS | Contatar administrador |
| **DB-004** | Foreign key constraint | Registro tem dependências | Remover dependências primeiro |
| **DB-005** | Unique constraint | Valor duplicado em campo único | Usar valor diferente |
| **DB-006** | Função RPC não encontrada | Função não configurada no banco | Executar SQL de configuração |

---

## ⚙️ Sistema (SYS)

| Código | Erro | Causa | Solução |
|--------|------|-------|---------|
| **SYS-001** | Erro inesperado | Erro não mapeado | Recarregar página |
| **SYS-002** | Recurso não encontrado | URL inválida | Verificar navegação |
| **SYS-003** | Sessão inválida | Dados corrompidos | Limpar cache e fazer login |
| **SYS-004** | Upload falhou | Erro ao enviar arquivo | Verificar tamanho/formato |
| **SYS-005** | Validação falhou | Dados inválidos | Verificar campos |
| **SYS-006** | Variável de ambiente não configurada | Falta configuração no .env | Adicionar variável no .env |

---

## � Como Usar

1. **Identifique** o código de erro na mensagem
2. **Localize** o código neste guia
3. **Leia** a causa e solução
4. **Aplique** a correção sugerida
5. **Persiste?** Entre em contato com suporte

---

## 🆘 Suporte Técnico

**Email:** suporte@yourtime.com  
**Documentação:** [README.md](./README.md)  

---

**Versão:** 2.0  
**Última atualização:** Novembro 2025
