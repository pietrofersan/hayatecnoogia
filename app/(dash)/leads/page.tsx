import Link from 'next/link'
import { AcoesLead } from '@/components/AcoesLead'
import { Painel, Vazio } from '@/components/Painel'
import type { Cliente, Lead } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; estado?: string }>
}) {
  const f = await searchParams
  const supabase = await supabaseServidor()

  let consulta = supabase
    .from('leads')
    .select('*, clientes(nome)')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (f.cliente) consulta = consulta.eq('cliente_id', f.cliente)
  if (f.estado === 'novos') consulta = consulta.eq('lido', false)
  if (f.estado === 'abertos') consulta = consulta.eq('respondido', false)

  const [{ data }, { data: clientes }] = await Promise.all([
    consulta,
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  const leads = (data ?? []) as unknown as (Lead & { clientes: { nome: string } | null })[]
  const naoLidos = leads.filter((l) => !l.lido).length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-pleno">Leads</h1>
        <p className="text-sm text-tenue">
          {leads.length} no filtro · {naoLidos} não lido(s)
        </p>
      </header>

      <form className="flex flex-wrap gap-2 text-sm">
        <select
          name="cliente"
          defaultValue={f.cliente ?? ''}
          className="rounded-lg border border-borda bg-vidro px-3 py-2 text-corpo outline-none focus:border-azul"
        >
          <option value="">Todos os clientes</option>
          {((clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]).map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select
          name="estado"
          defaultValue={f.estado ?? ''}
          className="rounded-lg border border-borda bg-vidro px-3 py-2 text-corpo outline-none focus:border-azul"
        >
          <option value="">Todos</option>
          <option value="novos">Não lidos</option>
          <option value="abertos">Não respondidos</option>
        </select>
        <button className="rounded-lg border border-borda px-3 py-2 text-corpo hover:border-suave hover:text-pleno">
          Filtrar
        </button>
        <Link href="/leads" className="rounded-lg px-3 py-2 text-tenue hover:text-corpo">
          Limpar
        </Link>
      </form>

      {leads.length === 0 ? (
        <Painel>
          <Vazio>Nenhum lead. Instale o snippet dos formulários (Config).</Vazio>
        </Painel>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <article
              key={l.id}
              className={`rounded-xl border bg-vidro p-5 ${
                l.lido ? 'border-borda' : 'border-magenta/40'
              }`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-medium text-pleno">
                    {l.nome ?? 'Sem nome'}
                    {!l.lido && (
                      <span className="ml-2 rounded bg-magenta/15 px-1.5 py-0.5 text-[10px] text-magenta">
                        NOVO
                      </span>
                    )}
                    {l.respondido && (
                      <span className="ml-2 rounded bg-verde/15 px-1.5 py-0.5 text-[10px] text-verde">
                        RESPONDIDO
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-tenue">
                    {l.clientes?.nome ?? 'sem cliente'} · {l.site ?? '—'} ·{' '}
                    {formatData(l.criado_em)}
                  </p>
                </div>
                <AcoesLead lead={l} />
              </header>

              <p className="mt-3 text-sm text-corpo">
                {[l.email, l.telefone].filter(Boolean).join(' · ') || 'sem contato informado'}
              </p>
              {l.mensagem && (
                <p className="mt-2 text-sm whitespace-pre-wrap text-corpo">{l.mensagem}</p>
              )}
              <p className="mt-3 text-[11px] text-tenue">
                LGPD: consentimento {l.consentimento ? 'registrado ✓' : 'ausente !'}
                {l.origem ? ` · origem ${JSON.stringify(l.origem)}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
