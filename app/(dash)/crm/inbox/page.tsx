import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { BotaoLink } from '@/components/Campo'
import { ChipLink } from '@/components/Chip'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge, type TomBadge } from '@/components/StatusBadge'
import { CRM_WORKSPACE_ID, ROTULO_CANAL } from '@/lib/crm'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { rotulo: string; tom: TomBadge }> = {
  open: { rotulo: 'ativo', tom: 'verde' },
  pending: { rotulo: 'pendente', tom: 'ambar' },
  closed: { rotulo: 'encerrado', tom: 'neutro' },
}

const TOM_CANAL: Record<string, TomBadge> = {
  whatsapp_qr: 'verde',
  whatsapp_cloud: 'verde',
  instagram: 'magenta',
  facebook: 'azul',
  mercado_livre: 'ambar',
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

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ pendentes?: string }>
}) {
  const { pendentes } = await searchParams
  const supabase = await supabaseServidor()

  const { data } = await supabase
    .from('conversations')
    .select(
      'id, ticket_number, status, last_message_at, window_expires_at, contacts(name), channel_accounts(channel), pipeline_stages(name, color)',
    )
    .eq('workspace_id', CRM_WORKSPACE_ID)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  const todas = (data ?? []) as unknown as Conversa[]
  const soPendentes = pendentes === '1'
  const conversas = soPendentes ? todas.filter((c) => c.status === 'pending') : todas
  const qtdPendentes = todas.filter((c) => c.status === 'pending').length

  return (
    <Painel
      titulo="Conversas"
      acao={
        <span className="font-mono text-[10.5px] text-fantasma">
          {conversas.length} de {todas.length}
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <ChipLink href="/crm/inbox" ativo={!soPendentes} scroll={false}>
          todas · {todas.length}
        </ChipLink>
        <ChipLink
          href={soPendentes ? '/crm/inbox' : '/crm/inbox?pendentes=1'}
          ativo={soPendentes}
          scroll={false}
        >
          só sem resposta · {qtdPendentes}
        </ChipLink>
      </div>

      {conversas.length === 0 ? (
        <Vazio
          descricao={
            todas.length === 0
              ? 'Aparecem aqui quando o primeiro canal (WhatsApp, Instagram…) estiver conectado.'
              : undefined
          }
          acao={soPendentes ? <BotaoLink href="/crm/inbox">Ver todas</BotaoLink> : undefined}
        >
          {todas.length === 0 ? 'Nenhuma conversa ainda' : 'Nenhuma conversa sem resposta'}
        </Vazio>
      ) : (
        <ul className="-mx-[22px] divide-y divide-azul/[0.07]">
          {conversas.map((c) => {
            const janelaExpirada =
              c.window_expires_at && new Date(c.window_expires_at) < new Date()
            const status = STATUS[c.status]
            const canal = c.channel_accounts?.channel ?? ''
            return (
              <li key={c.id}>
                <Link
                  href={`/crm/inbox/${c.id}`}
                  className="flex items-center gap-3 px-[22px] py-3 transition-colors hover:bg-azul/[0.07]"
                >
                  <Avatar nome={c.contacts?.name ?? '?'} tamanho={34} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[12.5px] font-medium text-pleno">
                        {c.contacts?.name ?? 'Sem nome'}
                      </span>
                      <span className="font-mono text-[10px] text-fantasma">
                        #{c.ticket_number}
                      </span>
                      {janelaExpirada && (
                        <StatusBadge tom="magenta">fora da janela de 24 h</StatusBadge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-tenue">
                      {ROTULO_CANAL[canal] ?? '—'}
                      {c.pipeline_stages && ` · ${c.pipeline_stages.name}`}
                      {c.last_message_at &&
                        ` · ${new Date(c.last_message_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </p>
                  </div>

                  <StatusBadge tom={TOM_CANAL[canal] ?? 'neutro'}>
                    {ROTULO_CANAL[canal] ?? 'canal'}
                  </StatusBadge>
                  <StatusBadge tom={status.tom} ponto={c.status === 'pending'}>
                    {status.rotulo}
                  </StatusBadge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Painel>
  )
}
