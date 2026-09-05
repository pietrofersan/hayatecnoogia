import { BotaoChecarRadar } from '@/components/BotaoChecarRadar'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { FormDominio } from '@/components/FormDominio'
import { KpiTile } from '@/components/KpiTile'
import { LinhaRadar } from '@/components/LinhaRadar'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge } from '@/components/StatusBadge'
import { Tabela } from '@/components/Tabela'
import type { Cliente, DominioRadar, EventoDominio, Site } from '@/lib/db'
import { ROTULO_ESTADO_DOMINIO } from '@/lib/db'
import { formatData } from '@/lib/money'
import { diasAte } from '@/lib/radar'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type LinhaComCliente = DominioRadar & { clientes: { nome: string } | null }
type EventoComDominio = EventoDominio & { dominios_radar: { dominio: string } | null }

const ORDENS = ['dominio', 'vence'] as const
type Ordem = (typeof ORDENS)[number]

export default async function Dominios({
  searchParams,
}: {
  searchParams: Promise<{
    vencendo?: string
    livres?: string
    pausados?: string
    ordem?: string
    asc?: string
  }>
}) {
  const { vencendo, livres, pausados, ordem, asc } = await searchParams
  const supabase = await supabaseServidor()

  const [{ data: dominios }, { data: eventos }, { data: clientes }, { data: sites }] =
    await Promise.all([
      supabase.from('dominios_radar').select('*, clientes(nome)').order('dominio'),
      supabase
        .from('eventos_dominio')
        .select('*, dominios_radar(dominio)')
        .order('em', { ascending: false })
        .limit(15),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('sites').select('id, dominio, ssl_expira, uptime_ok'),
    ])

  const todos = (dominios ?? []) as unknown as LinhaComCliente[]
  const historico = (eventos ?? []) as unknown as EventoComDominio[]
  const listaSites = (sites ?? []) as Pick<
    Site,
    'id' | 'dominio' | 'ssl_expira' | 'uptime_ok'
  >[]

  const ativos = todos.filter((d) => d.ativo)
  const vencem60 = ativos.filter((d) => {
    const dias = diasAte(d.expira_em)
    return dias !== null && dias <= 60
  })
  const disponiveis = ativos.filter((d) => d.estado === 'livre')
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const sslOk = listaSites.filter((s) => !s.ssl_expira || s.ssl_expira > em30).length

  const soVencendo = vencendo === '1'
  const soLivres = livres === '1'
  const mostrarPausados = pausados === '1'
  const chave: Ordem = ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : 'dominio'
  const crescente = asc !== '0'

  const lista = todos
    .filter((d) => (mostrarPausados ? !d.ativo : d.ativo))
    .filter((d) => {
      if (soVencendo) {
        const dias = diasAte(d.expira_em)
        if (dias === null || dias > 60) return false
      }
      if (soLivres && d.estado !== 'livre') return false
      return true
    })
    .sort((a, b) => {
      const d =
        chave === 'dominio'
          ? a.dominio.localeCompare(b.dominio)
          : (diasAte(a.expira_em) ?? 1e6) - (diasAte(b.expira_em) ?? 1e6)
      return crescente ? d : -d
    })

  function url(
    patch: Partial<{
      vencendo: boolean
      livres: boolean
      pausados: boolean
      ordem: Ordem
      asc: boolean
    }>,
  ) {
    const p = new URLSearchParams()
    if (patch.vencendo ?? soVencendo) p.set('vencendo', '1')
    if (patch.livres ?? soLivres) p.set('livres', '1')
    if (patch.pausados ?? mostrarPausados) p.set('pausados', '1')
    const o = patch.ordem ?? chave
    if (o !== 'dominio') p.set('ordem', o)
    if (!(patch.asc ?? crescente)) p.set('asc', '0')
    const q = p.toString()
    return q ? `/dominios?${q}` : '/dominios'
  }

  const cabecalhoOrdenavel = (rotulo: string, o: Ordem) => ({
    rotulo,
    href: url({ ordem: o, asc: chave === o ? !crescente : true }),
    ordem: chave === o ? (crescente ? ('asc' as const) : ('desc' as const)) : null,
  })

  const temFiltro = soVencendo || soLivres || mostrarPausados

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Radar de domínios"
        meta="Reconsulta por RDAP todo dia às 06:00 — avisa quando um domínio fica livre ou entra na janela de renovação"
        acoes={
          <>
            <BotaoChecarRadar />
            <FormDominio clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]} />
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Sob gestão"
          valor={String(ativos.length)}
          acento="azul"
          detalhe={<span>{todos.length - ativos.length} pausado(s)</span>}
        />
        <KpiTile
          rotulo="Vencem em 60 d"
          valor={String(vencem60.length)}
          acento={vencem60.length > 0 ? 'ambar' : 'verde'}
          detalhe={<span>renovação precisa de decisão</span>}
        />
        <KpiTile
          rotulo="Livres agora"
          valor={String(disponiveis.length)}
          acento="verde"
          detalhe={<span>disponíveis para registro</span>}
        />
        <KpiTile
          rotulo="Certificados SSL"
          valor={`${sslOk}/${listaSites.length}`}
          acento={sslOk < listaSites.length ? 'ambar' : 'ciano'}
          detalhe={<span>válidos por mais de 30 dias</span>}
        />
      </div>

      <Painel
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {mostrarPausados ? todos.length - ativos.length : ativos.length}
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            <ChipLink
              href={url({ vencendo: !soVencendo })}
              ativo={soVencendo}
              scroll={false}
            >
              vencem em 60 d · {vencem60.length}
            </ChipLink>
            <ChipLink href={url({ livres: !soLivres })} ativo={soLivres} scroll={false}>
              livres · {disponiveis.length}
            </ChipLink>
            <ChipLink
              href={url({ pausados: !mostrarPausados })}
              ativo={mostrarPausados}
              scroll={false}
            >
              pausados · {todos.length - ativos.length}
            </ChipLink>
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio
            descricao={
              todos.length === 0
                ? 'Adicione os que interessam — ou marque uma palavra em Segmentos e mande vigiar o domínio de lá.'
                : undefined
            }
            acao={temFiltro ? <BotaoLink href="/dominios">Limpar filtros</BotaoLink> : undefined}
          >
            {todos.length === 0
              ? 'Nenhum domínio no radar'
              : 'Nenhum domínio com esses filtros'}
          </Vazio>
        ) : (
          <Tabela
            cabecalho={[
              cabecalhoOrdenavel('Domínio', 'dominio'),
              'Cliente',
              'Estado',
              cabecalhoOrdenavel('Vence', 'vence'),
              'Registrador',
              'Checado',
              { rotulo: 'Ações', numerica: true },
            ]}
            minima="56rem"
          >
            {lista.map((d) => (
              <LinhaRadar key={d.id} dominio={d} cliente={d.clientes?.nome ?? null} />
            ))}
          </Tabela>
        )}
      </Painel>

      {listaSites.length > 0 && (
        <Painel titulo="Certificados e uptime" nota="Sites cadastrados em Config">
          <ul className="divide-y divide-azul/[0.07]">
            {listaSites.map((s) => {
              const dias = diasAte(s.ssl_expira)
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-mono">
                    {s.dominio}
                  </span>
                  <StatusBadge
                    tom={dias === null ? 'neutro' : dias <= 30 ? 'ambar' : 'verde'}
                  >
                    {dias === null ? 'sem ssl' : dias <= 30 ? `ssl ${dias} d` : 'ssl ok'}
                  </StatusBadge>
                  <StatusBadge
                    tom={s.uptime_ok === false ? 'magenta' : s.uptime_ok ? 'verde' : 'neutro'}
                  >
                    {s.uptime_ok === false
                      ? 'fora do ar'
                      : s.uptime_ok
                        ? 'no ar'
                        : 'sem checagem'}
                  </StatusBadge>
                </li>
              )
            })}
          </ul>
        </Painel>
      )}

      {historico.length > 0 && (
        <Painel titulo="Mudanças recentes">
          <ul className="divide-y divide-azul/[0.07]">
            {historico.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-corpo">
                  <span className="font-mono text-[11.5px] text-mono">
                    {e.dominios_radar?.dominio ?? '—'}
                  </span>{' '}
                  <span className="text-fantasma">
                    {e.de ? ROTULO_ESTADO_DOMINIO[e.de] : '—'} →
                  </span>{' '}
                  <span className={e.para === 'livre' ? 'text-verde' : 'text-suave'}>
                    {ROTULO_ESTADO_DOMINIO[e.para]}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-tenue">
                  {formatData(e.em)}
                </span>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  )
}
