import type { WAMessage } from 'baileys'
import { env } from './env.js'
import { supabase } from './supabase.js'
import type { ILogger } from './logger.js'

const WORKSPACE_ID = env.workspaceId()

/** "5511999999999@s.whatsapp.net" -> "+5511999999999". Grupo (@g.us) não entra aqui. */
function numeroDoJid(jid: string): string {
  return `+${jid.split('@')[0].split(':')[0]}`
}

export function ehGrupo(jid: string): boolean {
  return jid.endsWith('@g.us') || jid.endsWith('@broadcast')
}

/** Texto da mensagem — só os tipos comuns; mídia vira um rótulo, sem baixar o arquivo (fora do escopo do MVP). */
function textoDaMensagem(msg: WAMessage): { body: string | null; mediaLabel: string | null } {
  const m = msg.message
  if (!m) return { body: null, mediaLabel: null }

  if (m.conversation) return { body: m.conversation, mediaLabel: null }
  if (m.extendedTextMessage?.text) return { body: m.extendedTextMessage.text, mediaLabel: null }
  if (m.imageMessage) return { body: m.imageMessage.caption ?? null, mediaLabel: '[imagem]' }
  if (m.videoMessage) return { body: m.videoMessage.caption ?? null, mediaLabel: '[vídeo]' }
  if (m.audioMessage) return { body: null, mediaLabel: m.audioMessage.ptt ? '[áudio]' : '[arquivo de áudio]' }
  if (m.documentMessage) return { body: m.documentMessage.caption ?? null, mediaLabel: `[documento: ${m.documentMessage.fileName ?? '—'}]` }
  if (m.stickerMessage) return { body: null, mediaLabel: '[figurinha]' }
  if (m.locationMessage) return { body: null, mediaLabel: '[localização]' }
  return { body: null, mediaLabel: '[mensagem não suportada]' }
}

export async function upsertContato(jid: string, nome: string | null) {
  const { data: existente } = await supabase
    .from('contacts')
    .select('id, name')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('channel', 'whatsapp_qr')
    .eq('external_id', jid)
    .maybeSingle()

  if (existente) {
    // Só atualiza o nome se veio um novo e o contato ainda não tinha — não
    // sobrescreve um nome que já foi editado à mão no CRM.
    if (nome && !existente.name) {
      await supabase.from('contacts').update({ name: nome }).eq('id', existente.id)
    }
    return existente.id as string
  }

  const { data: criado, error } = await supabase
    .from('contacts')
    .insert({
      workspace_id: WORKSPACE_ID,
      channel: 'whatsapp_qr',
      external_id: jid,
      name: nome,
      phone: numeroDoJid(jid),
    })
    .select('id')
    .single()

  if (error) throw error
  return criado.id as string
}

async function conversaDoContato(canalId: string, contatoId: string): Promise<string> {
  const { data: existente } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contatoId)
    .eq('channel_account_id', canalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) return existente.id as string

  const { data: criada, error } = await supabase
    .from('conversations')
    .insert({
      workspace_id: WORKSPACE_ID,
      contact_id: contatoId,
      channel_account_id: canalId,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) throw error
  return criada.id as string
}

/** Mensagem recebida (fromMe = false) — grava e devolve o id da conversa. */
export async function registrarMensagemRecebida(
  canalId: string,
  msg: WAMessage,
  logger: ILogger,
): Promise<void> {
  const jid = msg.key.remoteJid
  if (!jid || ehGrupo(jid)) return

  const { body, mediaLabel } = textoDaMensagem(msg)
  const texto = [mediaLabel, body].filter(Boolean).join(' ') || null
  if (!texto && !msg.key.id) return

  const contatoId = await upsertContato(jid, msg.pushName ?? null)
  const conversaId = await conversaDoContato(canalId, contatoId)
  const agora = new Date().toISOString()

  // Sem ON CONFLICT: o índice de idempotência (messages_external_id_idx) é
  // parcial (só quando external_message_id não é nulo), e o upsert do
  // PostgREST não sabe repetir esse predicado — checagem manual em vez
  // disso, sempre correta independente de como o índice está montado.
  if (msg.key.id) {
    const { data: jaExiste } = await supabase
      .from('messages')
      .select('id')
      .eq('workspace_id', WORKSPACE_ID)
      .eq('external_message_id', msg.key.id)
      .maybeSingle()
    if (jaExiste) return
  }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversaId,
    workspace_id: WORKSPACE_ID,
    direction: 'inbound',
    sender_type: 'contact',
    body: texto,
    external_message_id: msg.key.id,
    status: 'delivered',
    created_at: msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
      : agora,
  })

  if (error) {
    logger.error({ error, msgId: msg.key.id }, 'falhou ao gravar mensagem recebida')
    return
  }

  await supabase.from('conversations').update({ last_message_at: agora }).eq('id', conversaId)
}
