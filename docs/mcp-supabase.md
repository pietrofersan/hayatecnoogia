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

## Servidores

| Nome | URL | Uso |
|---|---|---|
| `supabase-admin` | `https://mcp.supabase.com/mcp` | Conta inteira, leitura e escrita |
| `supabase-prod` | `https://mcp.supabase.com/mcp?project_ref=<REF>&read_only=true` | Um projeto só, somente leitura |

Escopo `local` nos dois. O escopo `project` grava em `.mcp.json`, que vai para o
Git e vazaria o token — por isso `.mcp.json` está no `.gitignore`.

---

# PARTE 1 — Computador principal (fazer uma vez)

## 1. Gerar o token

1. Abra https://supabase.com/dashboard/account/tokens
2. Clique em **Generate new token**
3. Dê um nome, por exemplo `claude-code`
4. **Copie e guarde o token agora** — a Supabase mostra uma única vez.
   Guarde num gerenciador de senhas; você vai precisar dele no outro computador.

## 2. Abrir o terminal na pasta do projeto

```bash
cd ~/hayatecnoogia    # ajuste se a pasta estiver em outro lugar
pwd                   # confirme que aparece o caminho do projeto
```

O `cd` importa: o escopo `local` amarra a configuração **à pasta do projeto**.
Rodar os comandos na pasta errada configura o lugar errado.

## 3. Ver o que existe hoje

```bash
claude mcp list
```

Anote o nome exato da conexão Supabase antiga (provavelmente `supabase`).

## 4. Remover a conexão antiga

```bash
claude mcp remove supabase
```

Troque `supabase` pelo nome que apareceu no passo 3.

## 5. Criar as duas conexões novas

Troque `SEU_TOKEN` pelo token do passo 1 nos dois comandos.

```bash
claude mcp add --transport http --scope local \
  supabase-admin https://mcp.supabase.com/mcp \
  --header "Authorization: Bearer SEU_TOKEN"
```

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

Aqui não tem descoberta nenhuma: é só repetir a configuração já resolvida.
Use **o mesmo token** e **o mesmo ref** da Parte 1.

## 1. Ter o projeto na máquina

```bash
cd ~/hayatecnoogia
git pull
```

Se ainda não tiver o projeto ali, clone antes:

```bash
git clone https://github.com/pietrofersan/hayatecnoogia.git
cd hayatecnoogia
```

## 2. Remover a conexão antiga, se houver

```bash
claude mcp list
claude mcp remove supabase
```

Se não aparecer nenhuma Supabase, pule este passo.

## 3. Criar as duas conexões

Mesmos comandos do passo 5 da Parte 1, já com o ref correto:

```bash
claude mcp add --transport http --scope local \
  supabase-admin https://mcp.supabase.com/mcp \
  --header "Authorization: Bearer SEU_TOKEN"
```

```bash
claude mcp add --transport http --scope local \
  supabase-prod 'https://mcp.supabase.com/mcp?project_ref=REF_CORRETO&read_only=true' \
  --header "Authorization: Bearer SEU_TOKEN"
```

## 4. Conferir e reiniciar

```bash
claude mcp list
```

Reinicie o Claude Code. Pronto.

---

## Onde fica o token no disco

`~/.claude.json`, na chave `projects` → *caminho da pasta do projeto* →
`mcpServers`. Esse arquivo nunca vai para o Git.

Para editar o token depois sem refazer os comandos, abra esse arquivo e troque o
valor de `Authorization`.

## Dica: valendo para todos os projetos da máquina

Se quiser o `supabase-admin` disponível em qualquer pasta daquele computador, e
não só neste projeto, troque `--scope local` por `--scope user`. O token
continua fora do Git nos dois casos.

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
