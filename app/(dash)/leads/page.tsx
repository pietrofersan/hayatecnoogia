import { AcoesLead } from '@/components/AcoesLead'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { Ponto, StatusBadge } from '@/components/StatusBadge'
import type { Cliente, Lead } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LeadComCliente = Lead & { clientes: { nome: string } | null }

const ESTADOS = ['novos', 'abertos', 'respondidos'] as const
type Estado = (typeof ESTADOS)[number]

const ROTULO: Record<Estado, string> = {
  novos: 'não lidos',
  abertos: 'sem resposta',
  respondidos: 'respondidos',
}

export default async function Leads({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; estado?: string }>
}) {
  const f = await searchParams
  const supabase = await supabaseServidor()

  const [{ data }, { data: clientes }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
      .limit(200),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  const todos = (data ?? []) as unknown as LeadComCliente[]
  const estado = ESTADOS.find((e) => e === f.estado)

  const lista = todos.filter((l) => {
    if (f.cliente && l.cliente_id !== f.cliente) return false
    if (estado === 'novos') return !l.lido
    if (estado === 'abertos') return !l.respondido
    if (estado === 'respondidos') return l.respondido
    return true
  })

  const trintaDias = Date.now() - 30 * 864e5
  const doMes = todos.filter((l) => new Date(l.criado_em).getTime() >= trintaDias)
  const naoLidos = todos.filter((l) => !l.lido).length
  const respondidos = todos.filter((l) => l.respondido).length
  const umaHora = Date.now() - 36e5
  const semContato = todos.filter(
    (l) => !l.lido && new Date(l.criado_em).getTime() <= umaHora,
  ).length

  function url(patch: { estado?: Estado | null; cliente?: string | null }) {
    const p = new URLSearchParams()
    const c = patch.cliente === undefined ? f.cliente : patch.cliente
    const e = patch.estado === undefined ? estado : patch.estado
    if (c) p.set('cliente', c)
    if (e) p.set('estado', e)
    const q = p.toString()
    return q ? `/leads?${q}` : '/leads'
  }

  const conta = (e: Estado) =>
    todos.filter((l) =>
      e === 'novos' ? !l.lido : e === 'abertos' ? !l.respondido : l.respondido,
    ).length

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Leads por landing"
        meta={`${todos.length} lead(s) registrados · SLA de primeiro contato de 1 hora`}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Leads · 30 d"
          valor={String(doMes.length)}
          acento="ciano"
          detalhe={<span>de todas as landings</span>}
        />
        <KpiTile
          rotulo="Não lidos"
          valor={String(naoLidos)}
          acento={naoLidos > 0 ? 'ambar' : 'verde'}
          detalhe={<span>aguardando triagem</span>}
        />
        <KpiTile
          rotulo="Respondidos"
          valor={
            todos.length > 0
              ? `${Math.round((respondidos / todos.length) * 100)}%`
              : '—'
          }
          acento="verde"
          detalhe={<span>{respondidos} de {todos.length}</span>}
        />
        <KpiTile
          rotulo="Sem contato"
          valor={String(semContato)}
          acento={semContato > 0 ? 'magenta' : 'verde'}
          detalhe={<span>SLA de 1 h estourado</span>}
        />
      </div>

      <Painel
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {todos.length}
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <BarraFiltros>
            <ChipLink href={url({ estado: null })} ativo={!estado} scroll={false}>
              todos · {todos.length}
            </ChipLink>
            {ESTADOS.map((e) => (
              <ChipLink
                key={e}
                href={url({ estado: estado === e ? null : e })}
                ativo={estado === e}
                scroll={false}
              >
                {ROTULO[e]} · {conta(e)}
              </ChipLink>
            ))}
          </BarraFiltros>

          <form className="flex items-center gap-2">
            {estado && <input type="hidden" name="estado" value={estado} />}
            <select
              name="cliente"
              defaultValue={f.cliente ?? ''}
              className="rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3 py-2 text-[12px] text-corpo outline-none focus:border-ciano"
            >
              <option value="">Todos os clientes</option>
              {((clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <button className="min-h-[36px] cursor-pointer rounded-btn border border-borda-forte bg-white/[0.03] px-[15px] text-[12.5px] text-suave hover:border-azul/45 hover:text-corpo">
              Filtrar
            </button>
          </form>
        </div>

        {lista.length === 0 ? (
          <Vazio
            descricao={
              todos.length === 0
                ? 'Instale o snippet dos formulários pela tela de Config.'
                : undefined
            }
            acao={
              estado || f.cliente ? <BotaoLink href="/leads">Ver todos</BotaoLink> : undefined
            }
          >
            {todos.length === 0 ? 'Nenhum lead ainda' : 'Nenhum lead com esses filtros'}
          </Vazio>
        ) : (
          <div className="grid gap-2.5">
            {lista.map((l) => (
              <article
                key={l.id}
                className={`rounded-card border bg-white/[0.02] p-[18px] transition-colors ${
                  l.lido ? 'border-borda hover:border-azul/45' : 'border-magenta/40'
                }`}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-1.5">
                      <Ponto tom={l.lido ? 'neutro' : 'magenta'} pulsa={!l.lido} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-pleno">
                        {l.nome ?? 'Sem nome'}
                        {!l.lido && <StatusBadge tom="magenta">novo</StatusBadge>}
                        {l.respondido && <StatusBadge tom="verde">respondido</StatusBadge>}
                      </h2>
                      <p className="mt-1 truncate font-mono text-[10.5px] text-tenue">
                        {l.clientes?.nome ?? 'sem cliente'} ·{' '}
                        <span className="text-ciano">{l.site ?? '—'}</span> ·{' '}
                        {formatData(l.criado_em)}
                      </p>
                    </div>
                  </div>
                  <AcoesLead lead={l} />
                </header>

                <p className="mt-3 font-mono text-[11.5px] text-mono">
                  {[l.email, l.telefone].filter(Boolean).join(' · ') ||
                    'sem contato informado'}
                </p>
                {l.mensagem && (
                  <p className="mt-2 text-[12.5px] whitespace-pre-wrap text-corpo">
                    {l.mensagem}
                  </p>
                )}
                <p className="mt-3 border-t border-borda pt-2.5 font-mono text-[10px] text-fantasma">
                  LGPD: consentimento{' '}
                  {l.consentimento ? (
                    <span className="text-verde">registrado ✓</span>
                  ) : (
                    <span className="text-ambar">ausente !</span>
                  )}
                </p>
              </article>
            ))}
          </div>
        )}
      </Painel>
    </div>
  )
}
