> Escrito originalmente para o app CRM separado (`pietrofersan/haya-app`), que ficou parado — hoje é referência para o módulo `app/(dash)/crm` deste repositório.

# UI — Inbox (referência)

Layout de referência aprovado para a tela de atendimento (sprint dias
11–15), baseado no padrão usado pelo Click Massa. Três colunas fixas:

1. **Rail de navegação** (estreito, ícones): conversas, busca, broadcast,
   contatos, equipe, funil, tarefas, configurações.
2. **Lista de conversas**:
   - Abas por status: Ativos / Pendentes / Grupos, com contador.
   - Busca + filtro.
   - Cada item: avatar, nome do contato, indicador online, tags coloridas
     (canal + categoria + agente responsável), timestamp, nº do ticket,
     preview da última mensagem (ou "Rascunho: ..." se houver rascunho
     salvo), badge vermelho **"Fora da janela de tempo"** quando a janela
     de 24h do WhatsApp expirou.
3. **Thread da conversa**:
   - Cabeçalho: avatar, nome, telefone/handle; ações (buscar, encaminhar,
     desfazer, atribuir agente, encerrar).
   - Bolhas de mensagem: enviadas à direita, recebidas à esquerda; status
     de entrega (pendente/enviada/lida) com ícone; resposta a mensagem
     anterior aparece como bolha citada (borda colorida + texto original).
   - Divisor de data entre mensagens de dias diferentes.
   - Banner fixo no rodapé quando a janela de 24h expirou: *"Para
     continuar o atendimento é necessário enviar um template. Clique aqui
     para escolher um template"* — força o agente a escolher um template
     aprovado antes de reabrir a conversa (regra do WhatsApp, não nossa).

## Como isso mapeia pro schema (`0001_init.sql`)

- Tags do card da conversa → `tags` + `conversation_tags` (livre, várias
  por conversa: canal, categoria, agente).
- Nº do ticket → `conversations.ticket_number` (sequencial).
- Badge de janela expirada → calculado a partir de
  `conversations.window_expires_at` vs. `now()` (só relevante quando o
  canal é `whatsapp_qr`/`whatsapp_cloud`).
- Status de entrega da mensagem → `messages.status`.
- Agente responsável → `conversations.assigned_to`.
- Rascunho → não persistido no MVP (guardado só no cliente); avaliar
  tabela dedicada se virar necessidade real de uso.
