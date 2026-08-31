> Escrito originalmente para o app CRM separado (`pietrofersan/haya-app`), que ficou parado — hoje é referência para o módulo `app/(dash)/crm` deste repositório.

# Roadmap

## Fase 1 — MVP interno
- [x] Modelo de dados único de conversa (contact / conversation / message)
      no Supabase — base para todos os adaptadores de canal.
- [ ] Adaptador WhatsApp via conector não-oficial (QR Code / Baileys) para
      validar o fluxo ponta a ponta rápido, sem esperar aprovação da Meta.
- [x] Scaffold do CRM (Next.js + Supabase): auth, funil/pipeline.
- [ ] Inbox unificado no CRM, lendo do modelo único de conversa.
- [ ] Adaptador Mercado Livre (OAuth2 + perguntas + mensagens pós-venda).

## Fase 2 — Produção / primeiros clientes pagantes
- [ ] Iniciar processo de Tech Provider / Solution Partner da Meta
      (cadastro demorado — começar em paralelo à Fase 1).
- [ ] Adaptador WhatsApp Cloud API oficial (substitui/complementa o QR).
- [ ] Adaptador Instagram e Facebook Messenger (Meta App Review).
- [ ] Multi-tenant: modelo de `channel_account` por cliente, fluxo de
      conexão de canal (embedded signup da Meta / OAuth Mercado Livre).
- [ ] Billing / provisionamento de novos clientes.

## Fase 3 — Escala e resiliência
- [ ] Fila de processamento de webhook (retry, idempotência) sob volume.
- [ ] Monitoramento de sessões WhatsApp QR (reconexão automática).
- [ ] Avaliar necessidade de separar o motor de mensageria em serviço
      dedicado (fora do processo do CRM) se o volume justificar.
