import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BotaoExpandir } from '@/components/BotaoExpandir'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { LigarCliente } from '@/components/LigarCliente'
import { LinhaPalavra } from '@/components/LinhaPalavra'
import { Painel, Vazio } from '@/components/Painel'
import { Tabela } from '@/components/Tabela'
import type { ChecagemDominio, Cliente, PalavraChave, Segmento } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type PalavraCompleta = PalavraChave & { checagens_dominio: ChecagemDominio[] }

const ORDENS = ['palavra', 'tendencia', 'volume'] as const
type Ordem = (typeof ORDENS)[number]

const PESO_TENDENCIA = { subindo: 2, estavel: 1, caindo: 0 } as const

/** Uma palavra tem domínio livre se qualquer extensão checada voltou disponível. */
function temDominioLivre(p: PalavraCompleta) {
  return p.checagens_dominio.some((c) => c.disponivel === true)
}

export default async function SegmentoDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    alta?: string
    livre?: string
    marcadas?: string
    ordem?: string
    asc?: string
  }>
}) {
  const { id } = await params
  const { alta, livre, marcadas, ordem, asc } = await searchParams
  const supabase = await supabaseServidor()

  const [{ data: segmento }, { data: palavras }, { data: clientes }] = await Promise.all([
    supabase.from('segmentos').select('*, clientes(id, nome)').eq('id', id).single(),
    supabase.from('palavras_chave').select('*, checagens_dominio(*)').eq('segmento_id', id),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  if (!segmento) notFound()
  const s = segmento as unknown as Segmento & {
    clientes: { id: string; nome: string } | null
  }
  const todas = (palavras ?? []) as unknown as PalavraCompleta[]

  const soAlta = alta === '1'
  const soLivre = livre === '1'
  const soMarcadas = marcadas === '1'
  const chave: Ordem = ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : 'palavra'
  const crescente = asc !== '0'

  const lista = todas
    .filter(
      (p) =>
        (!soAlta || p.tendencia === 'subindo') &&
        (!soLivre || temDominioLivre(p)) &&
        (!soMarcadas || p.interessante),
    )
    .sort((a, b) => {
      const d =
        chave === 'palavra'
          ? a.termo.localeCompare(b.termo, 'pt-BR')
          : chave === 'volume'
            ? (a.volume ?? -1) - (b.volume ?? -1)
            : (a.tendencia ? PESO_TENDENCIA[a.tendencia] : -1) -
              (b.tendencia ? PESO_TENDENCIA[b.tendencia] : -1)
      return crescente ? d : -d
    })

  const base = `/segmentos/${s.id}`
  function url(
    patch: Partial<{
      alta: boolean
      livre: boolean
      marcadas: boolean
      ordem: Ordem
      asc: boolean
    }>,
  ) {
    const p = new URLSearchParams()
    if (patch.alta ?? soAlta) p.set('alta', '1')
    if (patch.livre ?? soLivre) p.set('livre', '1')
    if (patch.marcadas ?? soMarcadas) p.set('marcadas', '1')
    const o = patch.ordem ?? chave
    if (o !== 'palavra') p.set('ordem', o)
    if (!(patch.asc ?? crescente)) p.set('asc', '0')
    const q = p.toString()
    return q ? `${base}?${q}` : base
  }

  const cabecalhoOrdenavel = (rotulo: string, o: Ordem, numerica = false) => ({
    rotulo,
    numerica,
    href: url({ ordem: o, asc: chave === o ? !crescente : true }),
    ordem: chave === o ? (crescente ? ('asc' as const) : ('desc' as const)) : null,
  })

  const emAlta = todas.filter((p) => p.tendencia === 'subindo').length
  const comLivre = todas.filter(temDominioLivre).length
  const marcadasQtd = todas.filter((p) => p.interessante).length
  const temFiltro = soAlta || soLivre || soMarcadas

  return (
    <div className="space-y-3.5">
      <Link href="/segmentos" className="inline-block text-[11.5px] text-tenue hover:text-corpo">
        ← Segmentos
      </Link>

      <CabecalhoTela
        titulo={s.nome}
        meta={`${todas.length} palavra(s) · segmento criado em ${formatData(s.criado_em)}`}
        acoes={
          <>
            <BotaoExpandir segmentoId={s.id} />
            {s.clientes && (
              <BotaoLink href={`/clientes/${s.clientes.id}`} variante="roxo">
                Ficha de {s.clientes.nome}
              </BotaoLink>
            )}
          </>
        }
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Palavras medidas"
          valor={String(todas.length)}
          acento="azul"
          detalhe={<span>no segmento</span>}
        />
        <KpiTile
          rotulo="Em alta"
          valor={String(emAlta)}
          acento="verde"
          detalhe={<span>tendência subindo</span>}
        />
        <KpiTile
          rotulo="Com domínio livre"
          valor={String(comLivre)}
          acento="ciano"
          detalhe={<span>alguma extensão disponível</span>}
        />
        <KpiTile
          rotulo="Marcadas"
          valor={String(marcadasQtd)}
          acento="ambar"
          detalhe={<span>separadas para decisão</span>}
        />
      </div>

      {!s.clientes && (
        <Painel
          titulo="Virar projeto de cliente"
          nota="Prospecção livre — o segmento ainda não está ligado a ninguém"
        >
          <LigarCliente
            segmentoId={s.id}
            clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]}
          />
        </Painel>
      )}

      <Painel
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {todas.length} palavras
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            <ChipLink href={url({ alta: !soAlta })} ativo={soAlta} scroll={false}>
              só em alta · {emAlta}
            </ChipLink>
            <ChipLink href={url({ livre: !soLivre })} ativo={soLivre} scroll={false}>
              só domínio livre · {comLivre}
            </ChipLink>
            <ChipLink
              href={url({ marcadas: !soMarcadas })}
              ativo={soMarcadas}
              scroll={false}
            >
              marcadas · {marcadasQtd}
            </ChipLink>
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio
            descricao={
              todas.length === 0
                ? 'Clique em "Expandir com IA" para gerar as primeiras — precisa de GEMINI_API_KEY configurada.'
                : undefined
            }
            acao={
              temFiltro ? <BotaoLink href={base}>Limpar filtros</BotaoLink> : undefined
            }
          >
            {todas.length === 0
              ? 'Nenhuma palavra ainda'
              : 'Nenhuma palavra com esses filtros'}
          </Vazio>
        ) : (
          <Tabela
            cabecalho={[
              '',
              cabecalhoOrdenavel('Palavra', 'palavra'),
              cabecalhoOrdenavel('Tendência', 'tendencia'),
              cabecalhoOrdenavel('Volume', 'volume', true),
              'Domínio',
            ]}
            minima="48rem"
          >
            {lista.map((p) => (
              <LinhaPalavra key={p.id} palavra={p} checagens={p.checagens_dominio ?? []} />
            ))}
          </Tabela>
        )}
      </Painel>

      <p className="font-mono text-[10px] leading-relaxed text-fantasma">
        Tendência e volume aguardam a aprovação do Keyword Planner e do Google Trends —
        a checagem de domínio já é real, via RDAP.
      </p>
    </div>
  )
}
