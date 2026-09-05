# Handoff: HAYA Intelligence — painel de operação

## Visão geral
Painel interno do Grupo Haya para operar marketing de carteira: mede segmentos de mercado
(palavras, tendência, disponibilidade de domínio), mantém uma ficha por cliente, desenha o mapa de
posicionamento de cada marca, agenda publicações com aprovação humana obrigatória, controla
domínios/SSL, roda um CRM omnichannel e acompanha contratos e cobrança (Asaas). 19 telas, cada uma
com par desktop + mobile (a tela de CRM ainda se divide em 3 sub-abas: Conversas, Contatos, Funil).

## Sobre os arquivos deste pacote
Comece por `reference/Mapa de Módulos.dc.html`: é o índice do produto (14 módulos do painel +
acesso + serviços sem interface) e cada página desenhada é um link para o arquivo dela.

Os arquivos em `reference/` são **referências de design feitas em HTML** — protótipos que mostram
aparência e comportamento pretendidos, **não** código de produção para copiar. A tarefa é
**recriar estes designs no ambiente do codebase de destino** (React, Vue, SwiftUI, nativo…) usando
os padrões e bibliotecas já estabelecidos lá. Se ainda não existe ambiente, escolha o framework
mais adequado ao projeto e implemente os designs nele.

Os arquivos em `components/` e `tokens/` são um **ponto de partida opcional** (React + TypeScript +
Tailwind) que traduz os tokens e os seis componentes de base. Adapte nomes e API ao codebase; não
os trate como contrato.

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento, raios, brilhos e estados são finais.
Recrie pixel a pixel usando as bibliotecas do codebase. Os dados são reais do documento
HAYA Master (nenhum lorem ipsum) e podem ser mantidos como seed/fixture.

---

## Design tokens

### Superfícies (do mais profundo ao mais alto)
| Token | Valor | Uso |
| --- | --- | --- |
| abismo | `#04060D` | fundo da aplicação |
| breu | `#070B16` | miolo de anel/gráfico, furo de donut |
| vidro | `rgba(10,15,30,.55)` + `backdrop-filter: blur(18px)` | todo painel de conteúdo |
| vidro-chrome | `rgba(8,12,24,.85)` + `blur(22px)` | shell do app, barra inferior mobile |
| borda | `rgba(120,150,255,.14)` | 1 px em todo painel |
| borda-forte | `rgba(120,150,255,.30)` | divisores em destaque, inputs |

Fundo da aplicação = três halos radiais sobre `abismo` (nunca gradiente linear cheio):
`radial-gradient(1100px 620px at 8% -8%, rgba(76,111,255,.20), transparent 62%)`,
`radial-gradient(900px 520px at 96% 4%, rgba(168,85,247,.16), transparent 60%)`,
`radial-gradient(760px 520px at 50% 108%, rgba(34,211,238,.12), transparent 62%)`.

### Texto
`#F2F7FF` números e títulos de tela · `#EAF2FF` corpo primário · `#C7D3F0` valores mono ·
`#9AA7CC` corpo secundário · `#8593B9` nav inativa · `#6E7CA6` legendas ·
`#4F5D85` rótulos mono uppercase · `#3E4A6B` desabilitado.

### Acentos neon e semântica
| Cor | Hex | Significado fixo |
| --- | --- | --- |
| ciano | `#22D3EE` / claro `#67E8F9` | ação primária, IA, coleta, seleção |
| azul | `#4C6FFF` / claro `#8FA6FF` | navegação, estrutura, Facebook |
| roxo | `#A855F7` / claro `#C084FC` | contratos, landings, TikTok |
| verde | `#34E5B0` | funcionando, em dia, domínio livre, alta |
| âmbar | `#F5A524` | aguardando aprovação, vence em breve, buraco de cobertura |
| magenta | `#F0338F` / claro `#FF6FB1` / pálido `#FF8AC0` | falhou, em atraso, canibalização, Instagram |

Regra: máximo 2 cores de fundo por tela; a cor nunca é decorativa — sempre carrega estado.

### Tipografia
- **Space Grotesk** (400/500/600/700) — interface: títulos, rótulos, botões, texto corrido.
- **JetBrains Mono** (300/400/500/600) — todo número, código, timestamp, domínio, rótulo uppercase.

Escala aplicada: título de tela 20–22px/600 · seção 13.5px/600 · corpo 12.5px/400 ·
legenda 11.5px/400 · rótulo mono 9.5–10px/500 `letter-spacing .2em` uppercase ·
KPI 30–32px/600 mono (mobile hero 34–40px) · nav 13.5px/400.

### Espaço, raio, grade
- Espaço base 4: 8 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 26 px. `gap` de grid/flex — nunca margem entre irmãos.
- Raio: chip 999 · controle 12 · botão 14 · card 18 · card mobile 20–22 · painel 24 · barra inferior 24 · device 44.
- Desktop: shell mín. 1260px, sidebar 250px fixa, conteúdo `1fr`, padding 22–26px, gap 14px, KPIs `repeat(4,1fr)`.
- Mobile: 390×844, padding lateral 20px, gap 13px, alvo de toque mín. 44px (nav 52px).

### Sombra e brilho (três níveis)
1. **Painel** — `0 40px 120px rgba(0,0,0,.60), inset 0 1px 0 rgba(255,255,255,.06)`
2. **KPI** — `0 18px 44px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07)`
3. **Glow** — `box-shadow: 0 0 30px rgba(34,211,238,.22)` em botão primário; `text-shadow: 0 0 26px <acento 55–60%>` em número de KPI; `drop-shadow(0 0 6–9px <cor>)` em traço de gráfico e nó de mapa.

### Animações
`hPulse` 2.4s (ponto de status aguardando) · `hSweep` 1.6s (varredura HUD do overlay de carregamento) ·
`hSpin` 900ms (spinner 54px, borda 2px, topo ciano) · `hFade` 350ms `translateY(6px)→0` (entrada de tela).

---

## Telas

Ordem da navegação (a chave é o valor de `tela` no estado):

1. `dashboard` — **Dashboard**
2. `segmento` — **Segmento · detalhe**
3. `cliente` — **Ficha do cliente**
4. `mapa` — **Mapa de posicionamento**
5. `calendario` — **Calendário de publicação**
6. `dominios` — **Domínios**
7. `conteudo` — **Conteúdo gerado**
8. `contratos` — **Contratos e cobrança**
9. `alertas` — **Central de alertas**
10. `segmentos` — **Segmentos** (lista, abre em `segmento`)
11. `clientes` — **Carteira de clientes** (lista, abre em `cliente`)
12. `onboarding` — **Onboarding de cliente** (wizard de 5 passos)
13. `leads` — **Leads por landing**
14. `conversas` — **CRM · OmniCRM** (sub-abas: Conversas / Contatos / Funil)
15. `relatorio` — **Relatório mensal**
16. `integracoes` — **Integrações e coleta**
17. `usuarios` — **Usuários e permissões**
18. `config` — **Configurações da conta**
19. `login` — **Login / estado vazio**, com um segundo estado alternável **sem acesso** (sem shell: substitui sidebar + conteúdo)

### Tela → arquivo de design → rota do repo
Cada arquivo `Intelligence - Módulo - Página.dc.html` é um mount fino do shell
(`Intelligence - Protótipo navegável.dc.html`) já aberto naquela tela — toda a lógica e os dados
vivem no shell, então a fonte de verdade de cada tela é o shell, e o arquivo por página existe para
abrir/revisar/comentar uma tela isolada.

| # | Tela | Arquivo em `reference/` | Rota |
| --- | --- | --- | --- |
| 1 | Dashboard | `Intelligence - Dashboard - Visão geral.dc.html` | `app/(dash)/dashboard` |
| 2 | Segmento · detalhe | `Intelligence - Segmentos - Detalhe.dc.html` | `app/(dash)/segmentos/[id]` |
| 3 | Ficha do cliente | `Intelligence - Clientes - Ficha do cliente.dc.html` | `app/(dash)/clientes/[id]` |
| 4 | Mapa de posicionamento | `Intelligence - Segmentos - Mapa de posicionamento.dc.html` | nova |
| 5 | Calendário de publicação | `Intelligence - Conteúdo - Calendário de publicação.dc.html` | nova |
| 6 | Domínios | `Intelligence - Domínios - Radar.dc.html` | `app/(dash)/dominios` |
| 7 | Conteúdo gerado | `Intelligence - Conteúdo - Conteúdo gerado.dc.html` | nova |
| 8 | Contratos e cobrança | `Intelligence - Contratos - Contratos e cobrança.dc.html` | `app/(dash)/contratos` · `cobrancas` |
| 9 | Central de alertas | `Intelligence - Alertas - Central de alertas.dc.html` | nova |
| 10 | Segmentos (lista) | `Intelligence - Segmentos - Lista.dc.html` | `app/(dash)/segmentos` |
| 11 | Carteira de clientes | `Intelligence - Clientes - Carteira.dc.html` | `app/(dash)/clientes` |
| 12 | Onboarding de cliente | `Intelligence - Clientes - Onboarding.dc.html` | nova |
| 13 | Leads por landing | `Intelligence - Leads - Leads por landing.dc.html` | `app/(dash)/leads` |
| 14 | CRM · OmniCRM (3 abas) | `Intelligence - CRM - OmniCRM.dc.html` | `app/(dash)/crm/{inbox,contatos,funil}` |
| 15 | Relatório mensal | `Intelligence - Relatórios - Relatório mensal.dc.html` | nova |
| 16 | Integrações e coleta | `Intelligence - Integrações - Integrações e coleta.dc.html` | nova |
| 17 | Usuários e permissões | `Intelligence - Usuários - Usuários e permissões.dc.html` | nova |
| 18 | Configurações da conta | `Intelligence - Config - Configurações da conta.dc.html` | `app/(dash)/config` |
| 19 | Login · sem acesso | `Intelligence - Acesso - Login.dc.html` | `app/login` · `app/sem-acesso` |

Ainda em lote, sem arquivo próprio: **Cobranças · faturas** (`app/(dash)/cobrancas`) — hoje coberta
pela tela de Contratos e cobrança.

### 1. Dashboard
**Propósito:** o que precisa de atenção hoje.
**Layout desktop:** header (saudação + `↻ Recoletar agora` secundário + `+ Novo segmento` primário) →
4 KPIs `repeat(4,1fr)` gap 14 → grid `1.4fr 1fr`: à esquerda "Logs do sistema · 24 h" (5 linhas de log,
cada uma com ponto de status 7px, título 12.5px, meta mono 10.5px e badge de estado à direita);
à direita, coluna com anel de saúde 112px (`conic-gradient(#22D3EE 0deg, #4C6FFF 150deg, #A855F7 250deg, rgba(120,150,255,.12) 300deg)`,
miolo `#070B16` com "83% / saúde") e card "Agenda de hoje" (4 linhas: hora mono, badge de canal, título elidido).
**KPIs:** Clientes ativos 41 (azul, ▲3 no mês) · Contratos · 30 d 7 (roxo, R$ 21,4 mil) ·
Cobranças em atraso R$ 7,4 mil (magenta, 5 cobranças) · Domínios · 60 d 9 (ciano, 2 sem renovação automática).
Cada KPI tem sparkline de 1.8px ancorada em `right:0;bottom:0;width:62%;height:40px`.
**Mobile:** hero "Precisa de atenção hoje = 14" (ciano, sparkline full-bleed no rodapé) → 2 KPIs
(Clientes / Em atraso) → "Alertas recentes" (3 linhas, 48px) → 3 atalhos (Domínios, Conteúdo, Contratos).

### 2. Segmento · detalhe
Header com nome do segmento (Comunicação visual) e "10 palavras vizinhas · última medição 31/08/2026";
ações `↻ Recoletar` e `Virar projeto de cliente` (roxo). Três chips de filtro (`só em alta`,
`só domínio livre`, `marcadas`) + contagem "N de 10 palavras" à direita.
Tabela: Palavra · Tendência · Volume · .com.br · Marcar. Cabeçalhos Palavra/Tendência/Volume ordenáveis
(seta `↕ ↑ ↓`). Tendência = `▲ 38%` verde / `▼ 12%` magenta / `— estável` azul-claro, com
`text-shadow 0 0 12px <cor>55`. Domínio = badge `livre`/`ocupado`. Marcar = estrela `☆`/`★`
(âmbar com glow quando marcada). Estado vazio quando os filtros zeram: ícone tracejado 52px,
"Nenhuma palavra com esses filtros" + botão `Limpar filtros`.

### 3. Ficha do cliente
Cabeçalho: avatar 52px com gradiente `140deg #22D3EE → #4C6FFF 60% → #A855F7`, nome, linha meta
(`C-0052 · marketing mensal · cliente desde 03/2024 · 3 marcas no ar`) e dois badges (contrato ativo, em dia).
7 abas com sublinhado ciano de 2px: Visão geral · Mercado · Posicionamento · Conteúdo · Desempenho ·
Financeiro · Conversas. Cada aba mostra 1–3 painéis de vidro com listas `label → valor`
(valor em mono 11.5px; verde/âmbar/magenta quando semântico), separador `1px rgba(120,150,255,.07)`.
Mobile: 5 abas em pílulas com scroll horizontal, painéis empilhados.

### 4. Mapa de posicionamento
Canvas SVG `900×560` com halo radial; hub central r=30 (`aiacomunicacao.com.br`) com anel tracejado
r=48; 30 nós: subdomínio ciano, landing roxo, marca satélite verde, canibalização magenta,
buraco âmbar tracejado. Arestas `#4C6FFF` 1px opacidade .5; canibalização = linha magenta
`stroke-dasharray 5 5`. Legenda no canto inferior esquerdo, zoom `+ − ⤢` no superior direito.
Painel direito 300px: "Nó selecionado" (palavra alvo, escopo, status, telefone, tráfego, leads 30 d)
+ card de canibalização (magenta) + card de buracos (âmbar).

### 5. Calendário de publicação
Header: título + "Semana de 31/08 a 06/09 de 2026 · 17 publicações · nenhum post sai sem aprovação humana";
navegador de semana `‹ 31/08 – 06/09 ›`, `Semana atual`, `+ Programar post`.
5 chips de canal (Instagram, Facebook, TikTok, Blog, YouTube) — cor do próprio canal quando ativo,
cinza quando desligado; desligar remove os posts da grade.
Grade `repeat(7,1fr)` gap 9, coluna mín. 352px: cabeçalho `seg` + data (o dia atual em pílula ciano),
cartões de post (borda/fundo do canal, hora na cor do canal, ponto de status, título 11.5px, cliente mono 9.5px).
Dia sem post = caixa tracejada "livre". Abaixo, "Fila de aprovação humana" (painel âmbar) com até 4 peças,
cada uma com `Devolver` e `Aprovar`; fila zerada mostra "Fila limpa · nada aguardando aprovação".
Semanas fora de ±1 ficam vazias (estado vazio real, não erro).
Mobile: navegador de semana em barra de 44px, chips com scroll, agenda por dia (cabeçalho `SEG 31/08` + "4 posts"),
cartões de 64px com hora + ponto à esquerda e badge de canal à direita.

### 6. Domínios
4 KPIs: Sob gestão 12 · Vencem em 60 d 9 (âmbar) · Sem renovação auto 2 (magenta) · Certificados SSL 10/12 (ciano).
Chips `vencem em 60 d` e `sem renovação automática` + contagem. Tabela: Domínio (mono) · Cliente ·
Registrador (mono 11.5px) · Vence (ordenável, `6 d · 06/09`, cor por urgência: ≤7 magenta, ≤30 âmbar,
≤60 azul, resto cinza) · Renovação (`auto` verde / `manual` magenta) · SSL (`ssl ok` verde / `ssl 9 d` âmbar) ·
Ação `Renovar`. Mobile: 2 KPIs + cards com domínio, prazo, cliente/registrador e badges.

### 7. Conteúdo gerado
4 KPIs: Peças no mês 214 · Taxa de aprovação 87% (verde) · Aguardando você 4 (âmbar, reativo) ·
Custo por peça US$ 0,02 (roxo). Chips de status com contagem (`todos · 9`, `aguardando · 4`, …).
Grade `repeat(3,1fr)` de cards: badge de canal + badge de status + timestamp mono; título 13.5px/600;
trecho 11.5px; rodapé com cliente, modelo (azul-claro) e custo separado por borda superior;
se `aguardando`, dupla de botões `Devolver` / `Aprovar` (verde). Aprovar/devolver muda o status em toda a
aplicação (KPI, chips, fila do calendário). Mobile: hero "Aguardando você" + chips + cards com botões de 44px.

### 8. Contratos e cobrança
4 KPIs: Receita recorrente R$ 96,7 mil (▲4,2%) · A vencer · 30 d R$ 21,4 mil · Em atraso R$ 7,4 mil (magenta) ·
Ticket médio R$ 2.359. Chips `todos · 9`, `em dia · 4`, `a vencer · 2`, `em atraso · 3`.
Grade `1.55fr 1fr`: tabela (Cliente + código mono, Plano, Mensalidade mono à direita, Vence, Situação como badge)
e coluna direita com "Régua de cobrança Asaas" (D+1 lembrete WhatsApp · D+3 segunda via · D+7 alerta ao gestor ·
D+15 suspensão) e "Webhook Asaas · 24 h" (PAYMENT_CONFIRMED 41, CREATED 18, OVERDUE 5, REFUNDED 1).
Mobile: hero "Em atraso" + 2 KPIs + chips + cards de contrato.

### 9. Login / estado vazio
Painel único `1.05fr .95fr`, mín. 680px. Esquerda: gradiente `160deg` azul→roxo→breu com grade de 44px
mascarada por radial; logo 210px; manchete 27px/600 ("A camada de inteligência que mede o mercado antes de
escrever uma linha."); 3 métricas mono (1.284 palavras medidas · 18 segmentos ativos · 04:12 última coleta).
Direita: rótulo `ACESSO RESTRITO` ciano `letter-spacing .34em`, "Entrar no painel", campos E-mail e Senha
(raio 13, `rgba(10,15,30,.72)`, foco = borda ciano + halo `0 0 0 3px rgba(34,211,238,.12)`),
"Manter conectado" + "Esqueci a senha", botão `Entrar` (gradiente ciano→azul, glow), divisor `ou`,
`Continuar com Google Workspace`, nota "Sessão registrada em webhook_logs · 2FA obrigatório para perfis admin".
Um link mono discreto no rodapé ("Ver estado sem acesso →") alterna para o **segundo estado**: card centralizado
("HAYA / MASTER", "Sua conta está autenticada, mas não faz parte da equipe do Master", instrução para
cadastro em `usuarios_master`, botão texto "Sair e tentar com outra conta") — mesmo painel direito, lado
esquerdo inalterado. Mobile: mesma composição em uma coluna dentro do frame, campos de 50px e botão de 52px,
com o mesmo link para alternar o estado sem acesso.

### 10. Central de alertas
Header + `Resolver todos`. 3 KPIs: Críticos (magenta) · Atenção (âmbar) · Resolvidos hoje (verde).
Chips de severidade/origem com contagem. Lista de alertas: ponto de status, título, meta mono, badge de
nível, botão de destino (leva à tela relacionada) e `Resolver` (verde, some da lista e do dashboard).
Estado vazio: check 56px verde, "Nada pendente nesse filtro", nota da próxima varredura (04:00).

### 11. Segmentos (lista)
Header + `↻ Recoletar todos` + `+ Novo segmento`. Chips `com palavra em alta` / `sem cliente ligado` + contagem.
Tabela: Segmento (+raiz mono) · Palavras (ordenável) · Em alta (ordenável, badge verde/magenta) ·
.com.br livres · Clientes (badge) · Coleta (hora) · Ação `Abrir` → tela `segmento`. Estado vazio com `Limpar filtros`.

### 12. Carteira de clientes (lista)
Header + `+ Novo cliente` (→ Onboarding). Chips de situação + contagem. Grade `repeat(3,1fr)` de cards:
avatar+iniciais, nome, código+plano, badge de situação, MRR mono + contagem de posts, barra de "saúde da conta"
(5px, cor por faixa), botões `Abrir ficha` (→ `cliente`) e `Relatório` (→ `relatorio`). Estado vazio com `Ver todos`.

### 13. Onboarding de cliente
Wizard de 5 passos com trilha de progresso no topo (bolinhas + rótulo do passo atual). Passos: Dados da
empresa → Segmento e palavras-chave → Plano e contrato → Integrações (WhatsApp, domínio, Meta) → Revisão e
ativação. Cada passo é um painel de vidro com campos rotulados; navegação `Voltar` (secundário) /
`Continuar` (primário) — no último passo, `Ativar cliente` fecha o wizard e leva à ficha do novo cliente.

### 14. Leads por landing
Header + `Exportar CSV`. 4 KPIs: Leads · 30 d 214 (▲11%) · Custo por lead R$ 43,75 · Convertidos 12,4% ·
Sem contato (âmbar, SLA 1 h). Chips de status/canal + contagem. Tabela: Lead (+telefone mono) · Landing
(mono ciano) · Palavra · Canal (badge) · Quando · Situação (badge). Estado vazio com `Ver todos`.

### 15. CRM · OmniCRM
Header fixo ("WhatsApp, Instagram, Facebook e Mercado Livre num inbox só · SLA de resposta de 1 h") com
3 sub-abas em sublinhado ciano (padrão das abas da ficha do cliente): **Conversas**, **Contatos**, **Funil**.
- **Conversas** (padrão): grade `330px 1fr`. Lista à esquerda (avatar, nome, cliente, hora, badge de SLA,
  prévia da última mensagem elidida) + chip `só sem resposta`. Thread à direita: cabeçalho com avatar/nome/SLA
  e `Ver ficha`, bolhas de mensagem (cliente à esquerda cinza, nós à direita gradiente ciano-azul), composer
  com `Sugerir com IA` (roxo) e `Enviar` (ciano).
- **Contatos**: tabela simples — Nome (avatar+iniciais), Canal (badge por canal: WhatsApp verde, Instagram
  magenta, Facebook azul, Mercado Livre âmbar), Identificador (handle/telefone mono), Telefone, Último contato.
- **Funil**: quadro Kanban com scroll horizontal, uma coluna de 230px por estágio (Novo contato → Em conversa
  → Proposta enviada → Fechado → Perdido), ponto colorido + contagem no cabeçalho da coluna, cartões com
  avatar+iniciais, nome e `#ticket · data`.
Mobile: mesmas 3 sub-abas em pílulas com scroll horizontal; Contatos vira lista de cards de 64px;
Funil vira colunas empilhadas verticalmente (uma por estágio) em vez de lado a lado.

### 16. Relatório mensal
Seletor de cliente na coluna esquerda (300px) + relatório no corpo: KPIs (publicações, leads, sessões,
saúde), seções que podem ser ligadas/desligadas antes de exportar. Ações `Enviar por WhatsApp` e
`Exportar PDF`. Mobile: relatório em cartão único com os mesmos KPIs em grade 2×2.

### 17. Integrações e coleta
Header + `↻ Rodar coleta agora`. Painel "Pipeline da madrugada" com 6 etapas em grade horizontal (hora,
passo, ponto de status, duração). Chips de status + contagem. Grade `repeat(3,1fr)` de cards de integração:
ícone+sigla, nome, escopo, badge de status, última execução, credencial (cor por validade), nota, botão
de reconectar. Estado vazio com `Ver todas`.

### 18. Usuários e permissões
Tabela/cards de usuários: avatar+iniciais, nome, e-mail, badge de perfil (admin/gestor/analista/cliente,
cor própria por perfil), último acesso, indicador de 2FA. Chip de filtro por perfil.

### 19. Configurações da conta
Painéis de vidro por seção: modelo de IA por função (mecânico/publicado/auditoria), horário de coleta,
avisos e automações (lista de toggles com `estiloChave`/bolinha deslizante), credenciais (Asaas, webhook,
retenção de logs) e conta (e-mail/senha).

---

## Interações e comportamento
- **Navegação:** sidebar (desktop) e barra inferior de 5 posições (mobile: Hoje, Segmentos, Mapa em destaque, Agenda, Clientes). Domínios/Conteúdo/Contratos entram pelos 3 atalhos do Dashboard mobile.
- **Recoletar:** dispara overlay de carregamento por 1.6s sobre a área de conteúdo — `rgba(4,6,13,.72)` + blur 3px, spinner 54px, rótulo `COLETANDO…` e faixa de varredura de 120px animada.
- **Filtros:** chips são toggles independentes (segmento, domínios) ou seleção única (conteúdo, contratos). Toda lista filtrável tem estado vazio com ação de saída.
- **Ordenação:** clique no cabeçalho alterna asc/desc; a coluna ativa mostra `↑`/`↓`, as outras `↕`.
- **Aprovação:** `Aprovar` → `aprovado`; `Devolver` → `rascunho`. Efeito imediato em KPI "Aguardando você", contagem dos chips e fila do calendário (fonte única de verdade).
- **Semana:** `‹`/`›` deslocam 7 dias; `Semana atual` volta a 0. Datas são derivadas da segunda-feira base 31/08/2026.
- **Hover:** painel muda a borda para o acento (`rgba(76,111,255,.45)`); linha de tabela ganha `rgba(76,111,255,.07)`; botão secundário clareia texto e borda.
- **Login:** `Entrar` (e o botão Google) levam ao Dashboard. Sem validação no protótipo — no app, exigir e-mail válido, senha mín. 8 e 2FA para admin.
- **Responsivo:** ≥1280 shell completo · 1024–1279 sidebar colapsa em ícones de 64px · 768–1023 KPIs em 2 colunas, tabelas com scroll horizontal · <768 layout mobile (vertical, barra inferior, alvos de 44px).

## Estado necessário
```ts
tela: 'dashboard'|'segmento'|'cliente'|'mapa'|'calendario'|'dominios'|'conteudo'|'contratos'
     |'alertas'|'segmentos'|'clientes'|'onboarding'|'leads'|'conversas'|'relatorio'
     |'integracoes'|'usuarios'|'config'|'login'
dispositivo: 'desktop'|'mobile'        // só no protótipo; no app vem do viewport
carregando: boolean                    // overlay de coleta
aba: 'visao'|'mercado'|'posicionamento'|'conteudo'|'desempenho'|'financeiro'|'conversas'   // ficha do cliente
// segmento (detalhe)
soAlta, soLivre, soMarcadas: boolean; marcadas: Record<string, boolean>
ordem: 'palavra'|'delta'|'volume'; asc: boolean
// segmentos (lista)
segAlta, segSemCliente: boolean; ordemSeg: string; segAsc: boolean
// calendário
semana: number; canaisOff: Record<Canal, boolean>
// domínios
soVencendo, soSemAuto: boolean; domAsc: boolean
// conteúdo
filtroConteudo: 'todos'|'aguardando'|'aprovado'|'publicado'|'rascunho'
ajustes: Record<string, StatusConteudo>   // override otimista da aprovação
// contratos
filtroContrato: 'todos'|'em dia'|'a vencer'|'em atraso'
// alertas
filtroAlerta: string; resolvidos: Record<string, boolean>
// carteira de clientes
filtroCliente: string
// onboarding
passo: number                          // 1..5
// leads
filtroLead: string
// CRM · OmniCRM
crmAba: 'conversas'|'contatos'|'funil'; semResposta: boolean; conversaAtiva: string
// relatório mensal
relCliente: number; secoesOff: Record<string, boolean>
// integrações
filtroInt: string; intOk: Record<string, boolean>
// usuários
filtroPerfil: string
// login
email, senha: string; semAcesso: boolean   // segundo estado da tela de login
```
**Dados:** coleta noturna (Search Console + GA4 + WHOIS) grava segmentos/palavras; webhooks Asaas
alimentam cobrança; publicação usa Meta/TikTok/YouTube APIs. No app real, cada tela é uma query
independente com cache; a aprovação é mutação otimista (o override acima) com rollback em erro.

## Componentes de base
`components/` traz: `GlassPanel`, `KpiCard` (+`Sparkline`), `StatusBadge`, `FilterChip`, `DataTable`,
`SidebarNav`, `BottomNav`, util `cn`. Todos tipados, sem dependência além de React + Tailwind
(`tokens/tailwind.config.js`). Quem não usa Tailwind pode partir de `tokens/tokens.css`.

## Assets
- `assets/haya-logo-neon.svg` — logo completa (barras ciano → azul → roxo, wordmark marfim). Usada em 186px (header), 168px (sidebar), 124px (mobile), 172–210px (login).
- Variantes disponíveis no projeto: `haya-logo-dark.svg`, `haya-mark-dark.svg`, `haya-symbol-neon.svg`, `haya-wordmark-neon.svg`.
- Fontes: Google Fonts — Space Grotesk 400;500;600;700 e JetBrains Mono 300;400;500;600.
- Ícones: glifos Unicode no protótipo (`◈ ⌗ ◍ ✦ ▦ ◎ ✎ ◇ ⏻`). Substituir pelo icon set do codebase mantendo o mesmo peso óptico.

## Arquivos

```
design_handoff_haya_intelligence/
├─ README.md                  ← este arquivo: tokens, telas, comportamento, estado
├─ CLAUDE.md                  ← briefing de execução no repo pietrofersan/hayatecnoogia
├─ CONVENCOES-DESIGN.md       ← convenções do projeto de design (nomes, shells, tema, idioma)
├─ MAPA-DE-MODULOS.md         ← receita do Mapa de Módulos (como manter o índice)
├─ reference/                 ← os designs (abra no navegador; autocontidos)
│  ├─ Mapa de Módulos.dc.html                    ← comece aqui: índice + status de cada página
│  ├─ Intelligence - Protótipo navegável.dc.html ← shell e passeio pelas 19 telas (desktop + mobile)
│  ├─ Intelligence - Protótipo navegável - Claro.dc.html  ← espelho no tema claro
│  ├─ Intelligence - <Módulo> - <Página>.dc.html ← 19 arquivos, uma tela cada
│  ├─ Design System - Intelligence.dc.html       ← fonte da verdade dos tokens (10 seções)
│  ├─ Ref - Master - Dashboard.dc.html           ← estado atual do repo, para comparação
│  ├─ support.js                                 ← runtime dos protótipos (não editar)
│  └─ assets/                                    ← logo em 5 variantes
├─ tokens/                    ← tailwind.config.js + tokens.css prontos
└─ components/                ← 8 componentes de base em React + TS + Tailwind (opcional)
```

**Tema escuro é o canônico.** O claro é espelho e só muda paleta — implemente o escuro primeiro.

**Como abrir:** os `.dc.html` são autocontidos e rodam direto no navegador; mantenha cada arquivo
na mesma pasta que `support.js` e que o shell (`Intelligence - Protótipo navegável.dc.html`), porque
as telas por página importam o shell por caminho relativo.
