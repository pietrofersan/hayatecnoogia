// A rc14 do baileys tem os eventos de etiqueta (Events.js) mas não
// re-exporta os tipos Label/LabelAssociation no índice do pacote — deriva
// da própria BaileysEventMap em vez de depender de um caminho interno que
// pode mudar. LabelAssociationType (o enum, precisa em runtime) é o único
// valor que só existe no caminho interno mesmo.
import type { BaileysEventMap } from 'baileys'
import { LabelAssociationType } from 'baileys/lib/Types/LabelAssociation.js'

type Label = BaileysEventMap['labels.edit']
type LabelAssociation = BaileysEventMap['labels.association']['association']
import { env } from './env.js'
import { ehGrupo } from './sync.js'
import { supabase } from './supabase.js'
import type { ILogger } from './logger.js'

const WORKSPACE_ID = env.workspaceId()

/**
 * Etiqueta do WhatsApp Business (id fixo, nome pode mudar) -> tags do CRM.
 * Só etiqueta de conversa entra aqui — etiqueta de mensagem avulsa não tem
 * onde guardar no schema atual (conversation_tags é por conversa).
 */
export async function sincronizarEtiqueta(label: Label): Promise<void> {
  if (label.deleted) {
    await supabase
      .from('tags')
      .delete()
      .eq('workspace_id', WORKSPACE_ID)
      .eq('external_id', label.id)
    return
  }

  await supabase.from('tags').upsert(
    {
      workspace_id: WORKSPACE_ID,
      external_id: label.id,
      name: label.name,
      color: corDaEtiqueta(label.color),
    },
    { onConflict: 'workspace_id,external_id' },
  )
}

/** As 20 cores fixas do WhatsApp Business não têm hex oficial público — aproximação visual. */
const PALETA_ETIQUETA = [
  '#FF9485', '#FFB273', '#FFE24D', '#8CD9A3', '#5BC5A6', '#5BC0DE',
  '#729BE0', '#8C7AE0', '#C77AE0', '#E07AC7', '#E07A9B', '#C4776B',
  '#A3A3A3', '#7A9BE0', '#7AE0C4', '#B8E07A', '#E0C47A', '#E09B7A',
  '#9B7AE0', '#5b6660',
]

function corDaEtiqueta(color: number): string {
  return PALETA_ETIQUETA[color] ?? '#5b6660'
}

export async function sincronizarAssociacaoEtiqueta(
  associacao: LabelAssociation,
  tipo: 'add' | 'remove',
  canalId: string,
  logger: ILogger,
): Promise<void> {
  if (associacao.type !== LabelAssociationType.Chat) return // só chat, não mensagem avulsa
  const jid = associacao.chatId
  if (ehGrupo(jid)) return

  const { data: tag } = await supabase
    .from('tags')
    .select('id')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('external_id', associacao.labelId)
    .maybeSingle()

  if (!tag) {
    logger.warn({ labelId: associacao.labelId }, 'associação de etiqueta sem tag correspondente')
    return
  }

  const { data: contato } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', WORKSPACE_ID)
    .eq('channel', 'whatsapp_qr')
    .eq('external_id', jid)
    .maybeSingle()
  if (!contato) return

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contato.id)
    .eq('channel_account_id', canalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!conversa) return

  if (tipo === 'add') {
    await supabase
      .from('conversation_tags')
      .upsert({ conversation_id: conversa.id, tag_id: tag.id }, { onConflict: 'conversation_id,tag_id' })
  } else {
    await supabase
      .from('conversation_tags')
      .delete()
      .eq('conversation_id', conversa.id)
      .eq('tag_id', tag.id)
  }
}
