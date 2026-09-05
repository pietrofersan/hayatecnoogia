import { Avatar } from '@/components/Avatar'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { FormCliente } from '@/components/FormCliente'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge, type TomBadge } from '@/components/StatusBadge'
import type { Cliente, ModoCobranca, StatusContrato } from '@/lib/db'
import { ROTULO_TIPO } from '@/lib/db'
import { formatBRL } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Situacao = 'em dia' | 'a vencer' | 'em atraso' | 'sem contrato'

const TOM: Record<Situacao, TomBadge> = {
  'em dia': 'verde',
  'a vencer': 'ambar',
  'em atraso': 'magenta',
  'sem contrato': 'neutro',
}

const SITUACOES: Situacao[] = ['em dia', 'a vencer', 'em atraso', 'sem contrato']

type Cartao = {
  cliente: Cliente
  plano: string
  mrrCentavos: number
  contratos: number
  situacao: Situacao
  saude: number
}

/** A barra de saúde é a contagem de sinais em ordem, não um índice fechado. */
function corDaSaude(p: number): string {
  if (p >= 80) return 'var(--color-verde)'
  if (p >= 50) return 'var(--color-ambar)'
  return 'var(--color-magenta)'
}

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string }>
}) {
  const { q, situacao } = await searchParams
  const supabase = await supabaseServidor()

  let consulta = supabase.from('clientes').select('*').order('nome')
  if (q) consulta = consulta.ilike('nome', `%${q}%`)

  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)

  const [{ data }, { data: contratos }, { data: cobrancas }, { data: sites }] =
    await Promise.all([
      consulta,
      supabase
        .from('contratos')
        .select('cliente_id, tipo, modo, valor_centavos, status')
        .in('status', ['ativo', 'assinado', 'enviado']),
      supabase
        .from('cobrancas')
        .select('status, vencimento, contratos!inner(cliente_id)')
        .in('status', ['pendente', 'vencida']),
      supabase.from('sites').select('cliente_id, uptime_ok, ssl_expira'),
    ])

  const clientes = (data ?? []) as Cliente[]

  type Con = {
    cliente_id: string
    tipo: string
    modo: ModoCobranca
    valor_centavos: number
    status: StatusContrato
  }
  type Cob = { status: string; vencimento: string; contratos: { cliente_id: string } | null }
  type Sit = { cliente_id: string | null; uptime_ok: boolean | null; ssl_expira: string | null }

  const listaCon = (contratos ?? []) as unknown as Con[]
  const listaCob = (cobrancas ?? []) as unknown as Cob[]
  const listaSit = (sites ?? []) as unknown as Sit[]

  const cartoes: Cartao[] = clientes.map((c) => {
    const meus = listaCon.filter((x) => x.cliente_id === c.id)
    const ativos = meus.filter((x) => x.status === 'ativo')
    const minhasCob = listaCob.filter((x) => x.contratos?.cliente_id === c.id)
    const meusSites = listaSit.filter((x) => x.cliente_id === c.id)

    const atrasadas = minhasCob.filter((x) => x.status === 'vencida').length
    const aVencer = minhasCob.filter(
      (x) => x.status === 'pendente' && x.vencimento <= em7,
    ).length

    const situacao: Situacao =
      meus.length === 0
        ? 'sem contrato'
        : atrasadas > 0
          ? 'em atraso'
          : aVencer > 0
            ? 'a vencer'
            : 'em dia'

    const sinais = [
      atrasadas === 0,
      ativos.length > 0,
      !!c.asaas_customer_id,
      meusSites.every((s) => s.uptime_ok !== false),
      meusSites.every((s) => !s.ssl_expira || s.ssl_expira > em7),
    ]

    return {
      cliente: c,
      plano: ativos[0] ? (ROTULO_TIPO[ativos[0].tipo] ?? ativos[0].tipo) : 'sem plano',
      mrrCentavos: ativos
        .filter((x) => x.modo === 'recorrente')
        .reduce((s, x) => s + Number(x.valor_centavos), 0),
      contratos: meus.length,
      situacao,
      saude: Math.round((sinais.filter(Boolean).length / sinais.length) * 100),
    }
  })

  const filtro = SITUACOES.find((s) => s === situacao)
  const lista = filtro ? cartoes.filter((c) => c.situacao === filtro) : cartoes

  function url(patch: { situacao?: Situacao | null }) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    const s = patch.situacao === undefined ? filtro : patch.situacao
    if (s) p.set('situacao', s)
    const qs = p.toString()
    return qs ? `/clientes?${qs}` : '/clientes'
  }

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Carteira de clientes"
        meta={`${clientes.length} cliente(s) cadastrado(s) · espelhados no Asaas`}
        acoes={
          <>
            <FormCliente />
            <BotaoLink href="/clientes/onboarding" variante="primario">
              + Novo cliente
            </BotaoLink>
          </>
        }
      />

      <Painel
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {cartoes.length}
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <BarraFiltros>
            {SITUACOES.map((s) => {
              const n = cartoes.filter((c) => c.situacao === s).length
              if (n === 0) return null
              return (
                <ChipLink
                  key={s}
                  href={url({ situacao: filtro === s ? null : s })}
                  ativo={filtro === s}
                  scroll={false}
                >
                  {s} · {n}
                </ChipLink>
              )
            })}
          </BarraFiltros>

          <form className="w-full max-w-xs sm:w-auto">
            {filtro && <input type="hidden" name="situacao" value={filtro} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome…"
              className="w-full rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3.5 py-2 text-[12.5px] text-pleno outline-none placeholder:text-fantasma focus:border-ciano focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]"
            />
          </form>
        </div>

        {lista.length === 0 ? (
          <Vazio
            acao={
              filtro || q ? <BotaoLink href="/clientes">Ver todos</BotaoLink> : undefined
            }
          >
            {clientes.length === 0
              ? 'Nenhum cliente cadastrado'
              : 'Nenhum cliente com esses filtros'}
          </Vazio>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map(({ cliente: c, ...k }) => (
              <article
                key={c.id}
                className="rounded-card border border-borda bg-white/[0.02] p-[18px] transition-colors hover:border-azul/45"
              >
                <div className="flex items-start gap-3">
                  <Avatar nome={c.nome_fantasia ?? c.nome} tamanho={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-pleno">
                      {c.nome}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-tenue">
                      {k.plano} · {k.contratos} contrato(s)
                    </p>
                  </div>
                  <StatusBadge tom={TOM[k.situacao]}>{k.situacao}</StatusBadge>
                </div>

                <p className="tabular mt-4 font-mono text-[19px] font-semibold text-pleno">
                  {formatBRL(k.mrrCentavos)}
                  <span className="ml-1.5 font-sans text-[10.5px] font-normal text-fantasma">
                    /mês
                  </span>
                </p>

                <div className="mt-3.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
                      saúde da conta
                    </span>
                    <span className="font-mono text-[10.5px] text-mono">{k.saude}%</span>
                  </div>
                  <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-chip bg-borda">
                    <div
                      className="h-full rounded-chip"
                      style={{
                        width: `${k.saude}%`,
                        background: corDaSaude(k.saude),
                        boxShadow: `0 0 10px ${corDaSaude(k.saude)}`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <BotaoLink href={`/clientes/${c.id}`} variante="secundario">
                    Abrir ficha
                  </BotaoLink>
                  <BotaoLink href={`/relatorio?cliente=${c.id}`} variante="roxo">
                    Relatório
                  </BotaoLink>
                </div>
              </article>
            ))}
          </div>
        )}
      </Painel>
    </div>
  )
}
