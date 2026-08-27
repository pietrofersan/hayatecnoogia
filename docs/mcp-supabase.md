# MCP da Supabase — configuração local

> Conexão por **token de acesso pessoal (PAT)** em vez de OAuth.
> Motivo: o OAuth enxerga apenas uma organização; o PAT enxerga a conta inteira
> (ALLINO e HAYA).

## Servidores

| Nome | URL | Uso |
|---|---|---|
| `supabase-admin` | `https://mcp.supabase.com/mcp` | Conta inteira, leitura e escrita |
| `supabase-prod` | `https://mcp.supabase.com/mcp?project_ref=iktqvinbdcmqysgqslew&read_only=true` | Só o projeto de produção, somente leitura |

Ambos usam o cabeçalho `Authorization: Bearer <TOKEN>` e o escopo `local`.

## Por que escopo `local` e nunca `project`

O escopo `project` grava em `.mcp.json`, que vai para o Git — o token vazaria no
repositório. O escopo `local` grava em `~/.claude.json`, que fica só na sua
máquina. Por segurança, `.mcp.json` está no `.gitignore` deste projeto.

## Como configurar na sua máquina

Abra o terminal, entre na pasta do projeto e rode:

```bash
# 1. Remover a conexão antiga de OAuth (use o nome que aparecer em `claude mcp list`)
claude mcp remove supabase

# 2. Criar as duas conexões novas
claude mcp add --transport http --scope local \
  supabase-admin https://mcp.supabase.com/mcp \
  --header "Authorization: Bearer COLE_O_TOKEN_AQUI"

claude mcp add --transport http --scope local \
  supabase-prod 'https://mcp.supabase.com/mcp?project_ref=iktqvinbdcmqysgqslew&read_only=true' \
  --header "Authorization: Bearer COLE_O_TOKEN_AQUI"

# 3. Conferir
claude mcp list
```

Aspas simples na URL do `supabase-prod` são obrigatórias: sem elas o terminal
corta a URL no `&` e a conexão sai errada.

Troque `COLE_O_TOKEN_AQUI` pelo token gerado em
https://supabase.com/dashboard/account/tokens — ou cole o placeholder e edite
depois o arquivo `~/.claude.json`, na chave
`projects` → `<caminho do projeto>` → `mcpServers`.

Reinicie o Claude Code depois de trocar o token.
