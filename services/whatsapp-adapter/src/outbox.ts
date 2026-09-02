import type { WASocket } from 'baileys'
import { supabase } from './supabase.js'
import type { ILogger } from './logger.js'

type MensagemPendente = {
  id: string
  body: string | null
  conversation_id: string
  conversations: { contact_id: string; contacts: { external_id: string } | null } | null
}

/**
 * O Master grava a resposta do agente como `pending` (lib/acoes.ts,
 * responderConversa) porque não tem como entregar sozinho — é este
 * processo, com a conexão viva, que pega essas linhas e manda de verdade.
 * Poll simples em vez de fila: volume baixo, e evita depender de mais uma
 * peça de infra (Realtime, um broker) só pra isso.
 */
export function iniciarOutbox(sock: WASocket, canalId: string, logger: ILogger): () => void {
  let rodando = false

  const tick = async () => {
    if (rodando) return
    rodando = true
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, conversation_id, conversations!inner(contact_id, channel_account_id, contacts(external_id))')
        .eq('direction', 'outbound')
        .eq('status', 'pending')
        .eq('conversations.channel_account_id', canalId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (error) {
        logger.error({ error }, 'falhou ao buscar mensagens pendentes')
        return
      }

      for (const msg of (data ?? []) as unknown as MensagemPendente[]) {
        const jid = msg.conversations?.contacts?.external_id
        const texto = msg.body?.trim()
        if (!jid || !texto) {
          await supabase
            .from('messages')
            .update({ status: 'failed' })
            .eq('id', msg.id)
          continue
        }

        try {
          const enviada = await sock.sendMessage(jid, { text: texto })
          await supabase
            .from('messages')
            .update({ status: 'sent', external_message_id: enviada?.key.id ?? null })
            .eq('id', msg.id)
        } catch (err) {
          logger.error({ err, msgId: msg.id }, 'falhou ao enviar mensagem')
          await supabase.from('messages').update({ status: 'failed' }).eq('id', msg.id)
        }
      }
    } finally {
      rodando = false
    }
  }

  const intervalo = setInterval(tick, 5_000)
  tick()

  return () => clearInterval(intervalo)
}
