import { Vazio } from '@/components/Painel'
import { CRM_WORKSPACE_ID } from '@/lib/crm'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Cartao = {
  id: string
  ticket_number: number
  last_message_at: string | null
  pipeline_stage_id: string | null
  contacts: { name: string | null } | null
}

export default async function FunilPage() {
  const supabase = await supabaseServidor()

  const [{ data: estagios }, { data: conversas }] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, color')
      .eq('workspace_id', CRM_WORKSPACE_ID)
      .order('sort_order'),
    supabase
      .from('conversations')
      .select('id, ticket_number, last_message_at, pipeline_stage_id, contacts(name)')
      .eq('workspace_id', CRM_WORKSPACE_ID)
      .order('last_message_at', { ascending: false }),
  ])

  const porEstagio = new Map<string, Cartao[]>()
  for (const c of (conversas ?? []) as unknown as Cartao[]) {
    if (!c.pipeline_stage_id) continue
    const lista = porEstagio.get(c.pipeline_stage_id) ?? []
    lista.push(c)
    porEstagio.set(c.pipeline_stage_id, lista)
  }

  if (!estagios?.length) {
    return <Vazio>Nenhum estágio configurado para este workspace.</Vazio>
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {estagios.map((estagio) => {
        const cartoes = porEstagio.get(estagio.id) ?? []
        return (
          <div
            key={estagio.id}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-borda bg-vidro"
          >
            <div className="flex items-center gap-2 border-b border-borda px-3 py-2.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: estagio.color }}
                aria-hidden
              />
              <span className="text-sm font-medium text-pleno">{estagio.name}</span>
              <span className="ml-auto text-xs text-tenue">{cartoes.length}</span>
            </div>
            <div className="flex min-h-24 flex-col gap-2 p-2">
              {cartoes.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-tenue">Vazio</p>
              ) : (
                cartoes.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-borda bg-abismo px-3 py-2.5"
                  >
                    <p className="text-sm text-pleno">{c.contacts?.name ?? 'Sem nome'}</p>
                    <p className="mt-0.5 text-xs text-tenue">
                      #{c.ticket_number}
                      {c.last_message_at &&
                        ` · ${new Date(c.last_message_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
