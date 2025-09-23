# 🟢 Sistema de Keep-Alive - YourTime

Script automático para manter o banco de dados Supabase ativo e evitar suspensão por inatividade.

## 🚀 Por que usar o Keep-Alive?

O Supabase pode pausar projetos inativos para economizar recursos. Este script faz consultas periódicas ao banco para manter o projeto ativo.

## 📋 Funcionalidades

- ✅ Consultas automáticas a intervalos configuráveis
- ✅ Logs detalhados de todas as operações
- ✅ Tratamento robusto de erros
- ✅ Configuração via variáveis de ambiente
- ✅ Execução automática via Agendador de Tarefas
- ✅ Múltiplas opções de monitoramento

## 🛠️ Configuração Inicial

### 1. Configuração Automática (Recomendada)

```bash
# Configurar ambiente automaticamente
npm run keep-alive:setup

# Ver configurações atuais
npm run keep-alive:config
```

### 2. Configuração Manual

Adicione ao seu arquivo `.env`:

```env
# Keep-Alive Configuration
KEEP_ALIVE_INTERVAL=60        # Minutos entre consultas (padrão: 60)
MAX_KEEP_ALIVE_QUERIES=0      # Máximo de consultas (0 = ilimitado)
KEEP_ALIVE_LOG_FILE=keep-alive.log  # Arquivo de log
```

## 🚀 Como Usar

### Execução Manual

```bash
# Método 1: Usando npm scripts
npm run keep-alive

# Método 2: Execução direta
node keep-alive.js

# Método 3: Usando o configurador
npm run keep-alive:run
```

### Execução Automática (Windows)

#### Opção 1: Agendador de Tarefas (Recomendada)

```bash
# Configurar execução automática
npm run keep-alive:cron
```

Siga as instruções exibidas na tela para configurar no Agendador de Tarefas do Windows.

#### Opção 2: PowerShell (Execução Contínua)

```powershell
# Executar indefinidamente (não recomendado para produção)
powershell -Command "while($true) { node keep-alive.js; Start-Sleep -Seconds 3600 }"
```

#### Opção 3: PM2 (Produção)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar como serviço
pm2 start keep-alive.js --name "yourtime-keepalive"

# Configurar inicialização automática
pm2 startup
pm2 save
```

## 📊 Monitoramento

### Arquivo de Log

O script cria um arquivo `keep-alive.log` com todas as atividades:

```
[2024-01-15T10:00:00.000Z] [INFO] Iniciando script de keep-alive do banco de dados
[2024-01-15T10:00:00.000Z] [SUCCESS] Consulta 1 (profiles) OK - 5 registros
[2024-01-15T10:00:00.000Z] [SUCCESS] Consulta 2 (agendamento) OK - 12 registros
[2024-01-15T10:00:00.000Z] [INFO] Consulta #1 concluída com sucesso
```

### Estatísticas em Tempo Real

O script mostra estatísticas a cada hora:

```
=== ESTATÍSTICAS DO KEEP-ALIVE ===
Consultas executadas: 24
Intervalo: 60 minutos
Última execução: 2024-01-15T10:00:00.000Z
Próxima execução: 2024-01-15T11:00:00.000Z
Log file: C:\Users\...\YourTime-React\keep-alive.log
=================================
```

## ⚙️ Personalização

### Consultas Executadas

Por padrão, o script consulta estas tabelas:
- `profiles` - Dados dos usuários
- `agendamento` - Registros de ponto

Para adicionar mais consultas, edite o arquivo `keep-alive.js`:

```javascript
QUERIES: [
  // Consulta existente
  async (supabase) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    return { table: 'profiles', count: data, error }
  },

  // Nova consulta
  async (supabase) => {
    const { data, error } = await supabase
      .from('outra_tabela')
      .select('count', { count: 'exact', head: true })
    return { table: 'outra_tabela', count: data, error }
  }
]
```

### Intervalos Personalizados

```env
# Consulta a cada 30 minutos
KEEP_ALIVE_INTERVAL=30

# Consulta a cada 2 horas
KEEP_ALIVE_INTERVAL=120

# Consulta a cada 24 horas (1x por dia)
KEEP_ALIVE_INTERVAL=1440
```

### Limite de Consultas

```env
# Parar automaticamente após 100 consultas
MAX_KEEP_ALIVE_QUERIES=100

# Para sempre (padrão)
MAX_KEEP_ALIVE_QUERIES=0
```

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run keep-alive` | Executa o keep-alive diretamente |
| `npm run keep-alive:setup` | Configura ambiente automaticamente |
| `npm run keep-alive:config` | Mostra configurações atuais |
| `npm run keep-alive:run` | Executa via script auxiliar |
| `npm run keep-alive:cron` | Configura execução automática |

## 🔧 Solução de Problemas

### Erro: "Variáveis de ambiente não configuradas"

```bash
# Execute a configuração automática
npm run keep-alive:setup
```

### Erro: "Arquivo .env não encontrado"

```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Ou execute a configuração
npm run keep-alive:setup
```

### Logs não aparecem

Verifique se:
1. O arquivo `.env` existe e tem as configurações
2. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidas
3. O banco Supabase está acessível

### Script para automaticamente

Se o script parar sozinho, verifique:
1. O limite `MAX_KEEP_ALIVE_QUERIES` não foi atingido
2. Não há erros de conexão no log
3. O processo não foi interrompido

## 📈 Boas Práticas

1. **Configure intervalo adequado**: 60 minutos é ideal para a maioria dos casos
2. **Monitore os logs**: Verifique regularmente se as consultas estão funcionando
3. **Use execução automática**: Configure no Agendador de Tarefas para produção
4. **Mantenha atualizado**: O script funciona com as configurações existentes do projeto

## 🚨 Importante

- ✅ **Seguro**: Usa apenas consultas de leitura (SELECT)
- ✅ **Eficiente**: Consultas leves que não impactam performance
- ✅ **Configurável**: Adapte intervalos e consultas conforme necessidade
- ✅ **Monitorável**: Logs detalhados para acompanhar funcionamento

---

💡 **Dica**: Para projetos em produção, considere usar PM2 ou Docker para execução contínua e confiável.
