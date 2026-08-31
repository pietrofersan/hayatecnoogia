import { Painel, Vazio } from '@/components/Painel'
import { CRM_WORKSPACE_ID, ROTULO_CANAL } from '@/lib/crm'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ROTULO_STATUS: Record<string, { rotulo: string; icone: string; classe: string }> = {
  open: { rotulo: 'Ativo', icone: '●', classe: 'text-ok' },
  pending: { rotulo: 'Pendente', icone: '○', classe: 'text-alerta' },
  closed: { rotulo: 'Encerrado', icone: '×', classe: 'text-apagado' },
}

type Conversa = {
  id: string
  ticket_number: number
  status: 'open' | 'pending' | 'closed'
  last_message_at: string | null
  window_expires_at: string | null
  contacts: { name: string | null } | null
  channel_accounts: { channel: string } | null
  pipeline_stages: { name: string; color: string } | null
}

export default async function InboxPage() {
  const supabase = await supabaseServidor()

  const { data } = await supabase
    .from('conversations')
    .select(
      'id, ticket_number, status, last_message_at, window_expires_at, contacts(name), channel_accounts(channel), pipeline_stages(name, color)',
    )
    .eq('workspace_id', CRM_WORKSPACE_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const conversas = data as unknown as Conversa[] | null

  return (
    <Painel titulo={`Conversas${conversas?.length ? ` · ${conversas.length}` : ''}`}>
      {!conversas?.length ? (
        <Vazio>
          Nenhuma conversa ainda — aparecem aqui quando o primeiro canal
          (WhatsApp, Instagram...) estiver conectado.
        </Vazio>
      ) : (
        <ul className="-mx-5 divide-y divide-linha/60">
          {conversas.map((c) => {
            const janelaExpirada =
              c.window_expires_at && new Date(c.window_expires_at) < new Date()
            const status = ROTULO_STATUS[c.status]
            return (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-linha/30">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-marfim">
                      {c.contacts?.name ?? 'Sem nome'}
                    </span>
                    <span className="text-xs text-apagado">#{c.ticket_number}</span>
                    {janelaExpirada && (
                      <span className="rounded bg-critico/15 px-1.5 py-0.5 text-[10px] text-critico">
                        FORA DA JANELA DE 24H
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-apagado">
                    {ROTULO_CANAL[c.channel_accounts?.channel ?? ''] ?? '—'}
                    {c.pipeline_stages && ` · ${c.pipeline_stages.name}`}
                  </p>
                </div>
                <span className={`shrink-0 text-xs ${status.classe}`}>
                  <span aria-hidden>{status.icone}</span> {status.rotulo}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Painel>
  )
}
