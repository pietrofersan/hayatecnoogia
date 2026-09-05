import { Avatar } from '@/components/Avatar'
import { Painel, Vazio } from '@/components/Painel'
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
    return (
      <Painel>
        <Vazio>Nenhum estágio configurado para este workspace</Vazio>
      </Painel>
    )
  }

  return (
    <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 max-md:flex-col">
      {estagios.map((estagio) => {
        const cartoes = porEstagio.get(estagio.id) ?? []
        return (
          <section
            key={estagio.id}
            className="flex w-[230px] shrink-0 flex-col rounded-card border border-borda bg-vidro shadow-vidro backdrop-blur-[18px] max-md:w-full"
          >
            <header className="flex items-center gap-2 border-b border-borda px-3.5 py-3">
              <span
                aria-hidden
                className="size-[7px] shrink-0 rounded-full"
                style={{
                  backgroundColor: estagio.color,
                  boxShadow: `0 0 10px ${estagio.color}`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-pleno">
                {estagio.name}
              </span>
              <span className="tabular font-mono text-[10.5px] text-fantasma">
                {cartoes.length}
              </span>
            </header>

            <div className="flex min-h-24 flex-col gap-2 p-2">
              {cartoes.length === 0 ? (
                <p className="px-2 py-5 text-center font-mono text-[10.5px] text-fantasma">
                  vazio
                </p>
              ) : (
                cartoes.map((c) => (
                  <article
                    key={c.id}
                    className="flex items-center gap-2.5 rounded-ctrl border border-borda bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-azul/45"
                  >
                    <Avatar nome={c.contacts?.name ?? '?'} tamanho={26} />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-pleno">
                        {c.contacts?.name ?? 'Sem nome'}
                      </p>
                      <p className="truncate font-mono text-[10px] text-tenue">
                        #{c.ticket_number}
                        {c.last_message_at &&
                          ` · ${new Date(c.last_message_at).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
