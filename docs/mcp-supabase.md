# MCP da Supabase — passo a passo

> Conexão por **token de acesso pessoal (PAT)** em vez de OAuth.
> Motivo: o OAuth da Supabase dá acesso a **uma** organização, escolhida na hora
> de autorizar — a documentação oficial pede para "escolher a organização que
> contém o projeto com que você quer trabalhar". O PAT enxerga a conta inteira
> (ALLINO e HAYA).

## Por que precisa repetir em cada computador

| | Propaga entre computadores | Enxerga as duas organizações |
|---|---|---|
| Conector claude.ai (nuvem) | sim | não — só ALLINO |
| `claude mcp add` (token) | não — por máquina | sim |

Os conectores da claude.ai só autenticam por OAuth: não existe campo para colar
um token. O que propaga não carrega o token; o que carrega o token não propaga.
Daí a repetição.

## Os dois servidores

| Nome | Escopo | Alcance | Permissão |
|---|---|---|---|
| `supabase-admin` | `user` — a máquina toda | Conta inteira: 5 projetos, ALLINO e HAYA | Leitura **e escrita** |
| `supabase-prod` | `local` — uma pasta só | Um projeto fixo | Somente leitura |

O `supabase-admin` é o que responde "quero que funcione pra todos": escopo
`user` vale em qualquer pasta daquele computador. Configura uma vez por máquina.

O `supabase-prod` é opcional e serve de trilho de segurança num projeto
específico: fixa o `project_ref` e força `read_only=true`. Só vale a pena nos
repositórios cujo banco tem dado real de cliente.

**Cuidado consciente:** com o `supabase-admin` em escopo `user`, o Claude tem
escrita em todos os projetos, em qualquer pasta. Por isso as permissões
pré-aprovadas em `.claude/settings.local.json` liberam só o `supabase-prod`
(somente leitura). Operações de escrita pelo `supabase-admin` continuam pedindo
sua confirmação — mantenha assim.

O escopo `project` nunca: grava em `.mcp.json`, que vai para o Git e vazaria o
token. Por isso `.mcp.json` está no `.gitignore`.

---

# PARTE 0 — Instalar o Claude Code (só na primeira vez de cada máquina)

Se `claude mcp list` responder `command not found: claude`, o Claude Code não
está instalado naquela máquina. Ele é separado da versão do navegador.

## 0.1 Instalar

macOS, Linux ou WSL:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

## 0.2 Fechar e reabrir o Terminal

O instalador coloca o `claude` em `~/.local/bin`, e o Terminal só enxerga isso
numa janela nova. Feche a janela atual e abra outra.

## 0.3 Conferir

```bash
claude --version
```

Deve imprimir um número de versão. Se ainda disser `command not found`, rode:

```bash
~/.local/bin/claude doctor
```

## 0.4 Entrar na conta

```bash
claude
```

Abre o navegador para você logar na mesma conta claude.ai que já usa. Depois de
logado, saia com `/exit` e siga para a Parte 1.

Requer plano Pro, Max, Team ou Enterprise — o plano gratuito não inclui Claude
Code.

---

# PARTE 1 — Computador principal (fazer uma vez)

## 1. Gerar o token

1. Abra https://supabase.com/dashboard/account/tokens
2. Clique em **Generate new token**
3. Dê um nome, por exemplo `claude-code`
4. **Copie e guarde o token agora** — a Supabase mostra uma única vez.
   Guarde num gerenciador de senhas; você vai precisar dele no outro computador.

## 2. Abrir o terminal

Não precisa entrar em pasta nenhuma: o escopo `user` vale para a máquina toda.
Abra o Terminal e siga.

## 3. Ver o que existe hoje

```bash
claude mcp list
```

Numa instalação nova isso responde `No MCP servers configured` — normal, não é
erro. A conexão OAuth que enxergava só a ALLINO é o conector da claude.ai, que
vive na conta, não nesta máquina. Não há o que remover aqui.

Se aparecer alguma Supabase, anote o nome exato.

## 4. Remover a conexão antiga (só se apareceu alguma no passo 3)

```bash
claude mcp remove supabase
```

Troque `supabase` pelo nome que apareceu. Se a lista veio vazia, pule.

## 5. Criar a conexão principal

Troque `SEU_TOKEN` pelo token do passo 1 nos dois comandos.

```bash
claude mcp add --transport http --scope user \
  supabase-admin https://mcp.supabase.com/mcp \
  --header "Authorization: Bearer SEU_TOKEN"
```

Só isso já cobre os 5 projetos. O `supabase-prod` abaixo é opcional — rode
apenas se quiser o trilho de leitura num repositório específico, e aí **de
dentro da pasta daquele repositório**:

```bash
claude mcp add --transport http --scope local \
  supabase-prod 'https://mcp.supabase.com/mcp?project_ref=COLOQUE_O_REF&read_only=true' \
  --header "Authorization: Bearer SEU_TOKEN"
```

As **aspas simples** na URL do `supabase-prod` são obrigatórias. Sem elas o
terminal corta a URL no `&` e a conexão sai errada, sem avisar.

## 6. Conferir

```bash
claude mcp list
```

Os dois devem aparecer com `✓ Connected`. Se aparecer erro 401 ou 403, o token
está errado ou foi colado incompleto.

## 7. Reiniciar o Claude Code

Feche e abra de novo. Só assim ele lê a configuração nova.

## 8. Descobrir o `project_ref` correto

Nenhum projeto visível por OAuth corresponde a este repositório (ver
"Pendência" no fim). Com o token já valendo, peça no Claude Code:

> Liste minhas organizações e projetos Supabase usando o supabase-admin

Ache o projeto do HAYA MASTER e copie o `ref` dele.

## 9. Corrigir o `supabase-prod` com o ref certo

```bash
claude mcp remove supabase-prod
```

```bash
claude mcp add --transport http --scope local \
  supabase-prod 'https://mcp.supabase.com/mcp?project_ref=REF_CORRETO&read_only=true' \
  --header "Authorization: Bearer SEU_TOKEN"
```

Reinicie o Claude Code de novo.

---

# PARTE 2 — Outro computador

Sem descoberta nenhuma aqui, e sem precisar clonar nada primeiro. Use **o mesmo
token** da Parte 1.

Instale o Claude Code primeiro (Parte 0), depois:

```bash
claude mcp list
claude mcp remove supabase
```

Se não aparecer nenhuma Supabase, pule o `remove`.

```bash
claude mcp add --transport http --scope user \
  supabase-admin https://mcp.supabase.com/mcp \
  --header "Authorization: Bearer SEU_TOKEN"
```

```bash
claude mcp list
```

Reinicie o Claude Code. Pronto — os 5 projetos ficam visíveis.

Se você usa o trilho `supabase-prod` em algum repositório, repita aquele comando
de dentro da pasta do repositório clonado, com o mesmo ref.

---

## Onde fica o token no disco

`~/.claude.json`, na chave em `mcpServers` na raiz (escopo `user`) ou em
`projects` → *caminho da pasta* → `mcpServers` (escopo `local`). Esse arquivo nunca vai para o Git.

Para editar o token depois sem refazer os comandos, abra esse arquivo e troque o
valor de `Authorization`.

## Se o token vazar

Revogue em https://supabase.com/dashboard/account/tokens e gere outro. Aí é
refazer o passo 5 em cada computador.

## Pendência: o `project_ref` original estava errado

O ref `iktqvinbdcmqysgqslew`, configurado inicialmente, aponta para o projeto
**PRINT.BE** (organização ALLINO), de schema e-commerce (`products`, `orders`,
`quotes`, `stores`). Não tem nenhuma tabela em comum com o schema deste
repositório (`clientes`, `contratos`, `cobrancas`, `assinaturas`, `leads`,
`sites`, `templates_contrato`, `usuarios_master`, `webhook_logs` — ver
`supabase/migrations/0001_init.sql`).

Os outros dois projetos visíveis também não correspondem: `ALLINO`
(`hhfsaxkisrkhttxkgclt`, produtividade pessoal) e `omnicrm`
(`ghkckfamnpivlwlcjoez`, CRM de mensagens). O projeto do HAYA MASTER
provavelmente está na organização HAYA — invisível até o token entrar em uso.

Por isso o passo 8 da Parte 1.
