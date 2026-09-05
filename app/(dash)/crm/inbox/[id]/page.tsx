import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AcoesConversa } from '@/components/AcoesConversa'
import { Avatar } from '@/components/Avatar'
import { StatusBadge } from '@/components/StatusBadge'
import { FormResposta } from '@/components/FormResposta'
import { Painel, Vazio } from '@/components/Painel'
import { ROTULO_CANAL } from '@/lib/crm'
import type { EstagioFunil, MensagemCrm, StatusConversa } from '@/lib/db'
import { ROTULO_STATUS_MENSAGEM } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Conversa = {
  id: string
  ticket_number: number
  status: StatusConversa
  assigned_to: string | null
  pipeline_stage_id: string | null
  window_expires_at: string | null
  contacts: { name: string | null; phone: string | null; external_id: string } | null
  channel_accounts: { channel: string; display_name: string | null } | null
}

/** Divisor de data entre mensagens de dias diferentes (docs/crm/ui.md). */
function diaDe(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function horaDe(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ThreadConversa({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await supabaseServidor()

  const [{ data: conversaBruta }, { data: mensagensBrutas }, { data: estagiosBrutos }, { data: sessao }] =
    await Promise.all([
      supabase
        .from('conversations')
        .select(
          'id, ticket_number, status, assigned_to, pipeline_stage_id, window_expires_at, contacts(name, phone, external_id), channel_accounts(channel, display_name)',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at'),
      supabase
        .from('pipeline_stages')
        .select('id, name')
        .order('sort_order'),
      supabase.auth.getUser(),
    ])

  if (!conversaBruta) notFound()

  const conversa = conversaBruta as unknown as Conversa
  const mensagens = (mensagensBrutas ?? []) as MensagemCrm[]
  const estagios = (estagiosBrutos ?? []) as Pick<EstagioFunil, 'id' | 'name'>[]
  const janelaExpirada = Boolean(
    conversa.window_expires_at && new Date(conversa.window_expires_at) < new Date(),
  )

  let diaAnterior = ''

  return (
    <div className="space-y-3.5">
      <Link
        href="/crm/inbox"
        className="inline-block text-[11.5px] text-tenue hover:text-corpo"
      >
        ← Conversas
      </Link>

      <Painel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar nome={conversa.contacts?.name ?? '?'} tamanho={40} />
            <div className="min-w-0">
              <h2 className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-pleno">
                {conversa.contacts?.name ?? 'Sem nome'}
                <span className="font-mono text-[10px] font-normal text-fantasma">
                  #{conversa.ticket_number}
                </span>
                {janelaExpirada && (
                  <StatusBadge tom="magenta">fora da janela de 24 h</StatusBadge>
                )}
              </h2>
              <p className="mt-0.5 truncate font-mono text-[10.5px] text-tenue">
                {ROTULO_CANAL[conversa.channel_accounts?.channel ?? ''] ?? '—'}
                {' · '}
                {conversa.contacts?.phone ?? conversa.contacts?.external_id ?? '—'}
                {conversa.channel_accounts?.display_name &&
                  ` · via ${conversa.channel_accounts.display_name}`}
              </p>
            </div>
          </div>
          <AcoesConversa
            conversaId={conversa.id}
            status={conversa.status}
            estagioId={conversa.pipeline_stage_id}
            estagios={estagios}
            minha={Boolean(
              conversa.assigned_to && conversa.assigned_to === sessao.user?.id,
            )}
          />
        </div>
      </Painel>

      <Painel>
        {mensagens.length === 0 ? (
          <Vazio>Nenhuma mensagem nesta conversa ainda</Vazio>
        ) : (
          <ul className="space-y-3">
            {mensagens.map((m) => {
              const dia = diaDe(m.created_at)
              const novoDia = dia !== diaAnterior
              diaAnterior = dia
              const minha = m.direction === 'outbound'

              return (
                <li key={m.id}>
                  {novoDia && (
                    <p className="my-4 text-center font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
                      {dia}
                    </p>
                  )}
                  <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-card px-3.5 py-2.5 text-[12.5px] ${
                        minha
                          ? 'bg-linear-to-br from-ciano/25 to-azul/20 text-pleno shadow-glow-azul'
                          : 'border border-borda bg-white/[0.03] text-corpo'
                      }`}
                    >
                      {m.body ? (
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      ) : m.media_url ? (
                        <a
                          href={m.media_url}
                          className="text-ciano underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mídia
                        </a>
                      ) : (
                        <p className="text-fantasma">—</p>
                      )}
                      <p className="mt-1.5 font-mono text-[9.5px] text-tenue">
                        {horaDe(m.created_at)}
                        {minha && ` · ${ROTULO_STATUS_MENSAGEM[m.status]}`}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Painel>

      <Painel>
        <FormResposta conversaId={conversa.id} janelaExpirada={janelaExpirada} />
      </Painel>
    </div>
  )
}
