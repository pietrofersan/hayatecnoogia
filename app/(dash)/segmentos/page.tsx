import Link from 'next/link'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { FormSegmento } from '@/components/FormSegmento'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge } from '@/components/StatusBadge'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente, Segmento, TendenciaPalavra } from '@/lib/db'
import { formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Bruto = Segmento & {
  clientes: { nome: string } | null
  palavras_chave: { tendencia: TendenciaPalavra | null; interessante: boolean }[]
}

type Item = {
  id: string
  nome: string
  cliente: string | null
  palavras: number
  emAlta: number
  marcadas: number
  criado_em: string
}

const ORDENS = ['nome', 'palavras', 'alta'] as const
type Ordem = (typeof ORDENS)[number]

export default async function Segmentos({
  searchParams,
}: {
  searchParams: Promise<{ alta?: string; sem?: string; ordem?: string; asc?: string }>
}) {
  const { alta, sem, ordem, asc } = await searchParams
  const supabase = await supabaseServidor()

  const [{ data }, { data: clientes }] = await Promise.all([
    supabase
      .from('segmentos')
      .select('*, clientes(nome), palavras_chave(tendencia, interessante)')
      .order('criado_em', { ascending: false }),
    supabase.from('clientes').select('id, nome').order('nome'),
  ])

  const todos: Item[] = ((data ?? []) as unknown as Bruto[]).map((s) => ({
    id: s.id,
    nome: s.nome,
    cliente: s.clientes?.nome ?? null,
    palavras: s.palavras_chave.length,
    emAlta: s.palavras_chave.filter((p) => p.tendencia === 'subindo').length,
    marcadas: s.palavras_chave.filter((p) => p.interessante).length,
    criado_em: s.criado_em,
  }))

  const soAlta = alta === '1'
  const soSemCliente = sem === '1'
  const chave: Ordem = ORDENS.includes(ordem as Ordem) ? (ordem as Ordem) : 'nome'
  const crescente = asc !== '0'

  const lista = todos
    .filter((s) => (!soAlta || s.emAlta > 0) && (!soSemCliente || !s.cliente))
    .sort((a, b) => {
      const d =
        chave === 'nome'
          ? a.nome.localeCompare(b.nome, 'pt-BR')
          : chave === 'palavras'
            ? a.palavras - b.palavras
            : a.emAlta - b.emAlta
      return crescente ? d : -d
    })

  function url(patch: Partial<{ alta: boolean; sem: boolean; ordem: Ordem; asc: boolean }>) {
    const p = new URLSearchParams()
    const a = patch.alta ?? soAlta
    const s = patch.sem ?? soSemCliente
    const o = patch.ordem ?? chave
    const c = patch.asc ?? crescente
    if (a) p.set('alta', '1')
    if (s) p.set('sem', '1')
    if (o !== 'nome') p.set('ordem', o)
    if (!c) p.set('asc', '0')
    const q = p.toString()
    return q ? `/segmentos?${q}` : '/segmentos'
  }

  const cabecalhoOrdenavel = (rotulo: string, o: Ordem, numerica = false) => ({
    rotulo,
    numerica,
    href: url({ ordem: o, asc: chave === o ? !crescente : true }),
    ordem: chave === o ? (crescente ? ('asc' as const) : ('desc' as const)) : null,
  })

  const comAlta = todos.filter((s) => s.emAlta > 0).length
  const semCliente = todos.filter((s) => !s.cliente).length

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Segmentos"
        meta={`${todos.length} segmento(s) medidos · pesquisa de mercado por segmento ou por cliente`}
        acoes={
          <FormSegmento clientes={(clientes ?? []) as Pick<Cliente, 'id' | 'nome'>[]} />
        }
      />

      <Painel
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {todos.length}
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            <ChipLink href={url({ alta: !soAlta })} ativo={soAlta} scroll={false}>
              com palavra em alta · {comAlta}
            </ChipLink>
            <ChipLink href={url({ sem: !soSemCliente })} ativo={soSemCliente} scroll={false}>
              sem cliente ligado · {semCliente}
            </ChipLink>
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio
            descricao={
              todos.length === 0
                ? 'Comece por um segmento que você já conhece — validar antes de automatizar.'
                : undefined
            }
            acao={
              soAlta || soSemCliente ? (
                <BotaoLink href="/segmentos">Limpar filtros</BotaoLink>
              ) : undefined
            }
          >
            {todos.length === 0
              ? 'Nenhum segmento ainda'
              : 'Nenhum segmento com esses filtros'}
          </Vazio>
        ) : (
          <Tabela
            cabecalho={[
              cabecalhoOrdenavel('Segmento', 'nome'),
              'Cliente',
              cabecalhoOrdenavel('Palavras', 'palavras', true),
              cabecalhoOrdenavel('Em alta', 'alta', true),
              'Marcadas',
              'Criado',
              { rotulo: 'Ação', numerica: true },
            ]}
            minima="48rem"
          >
            {lista.map((s) => (
              <Linha key={s.id}>
                <Celula>
                  <Link href={`/segmentos/${s.id}`} className="text-pleno hover:text-ciano">
                    {s.nome}
                  </Link>
                </Celula>
                <Celula>
                  {s.cliente ?? <span className="text-fantasma">— prospecção —</span>}
                </Celula>
                <Celula numerica mono>
                  {s.palavras}
                </Celula>
                <Celula numerica>
                  {s.emAlta > 0 ? (
                    <StatusBadge tom="verde">▲ {s.emAlta}</StatusBadge>
                  ) : (
                    <span className="font-mono text-[11.5px] text-fantasma">—</span>
                  )}
                </Celula>
                <Celula numerica mono>
                  {s.marcadas || '—'}
                </Celula>
                <Celula mono>{formatData(s.criado_em)}</Celula>
                <Celula numerica>
                  <BotaoLink href={`/segmentos/${s.id}`}>Abrir</BotaoLink>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>
    </div>
  )
}
