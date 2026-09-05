import { AcoesConteudo } from '@/components/AcoesConteudo'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge } from '@/components/StatusBadge'
import {
  COR_CANAL,
  formatCustoUSD,
  TOM_CANAL,
  TOM_STATUS_CONTEUDO,
} from '@/lib/conteudo'
import type { Conteudo, StatusConteudo } from '@/lib/db'
import { ROTULO_CANAL_CONTEUDO } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FILTROS = ['todos', 'aguardando', 'aprovado', 'publicado', 'rascunho'] as const
type Filtro = (typeof FILTROS)[number]

type Peca = Conteudo & { clientes: { nome: string } | null }

function ehFiltro(v: string | undefined): v is Filtro {
  return FILTROS.includes(v as Filtro)
}

function url(f: Filtro) {
  return f === 'todos' ? '/conteudo' : `/conteudo?status=${f}`
}

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ConteudoGerado({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filtro: Filtro = ehFiltro(status) ? status : 'todos'

  const supabase = await supabaseServidor()
  const { data } = await supabase
    .from('conteudos')
    .select('*, clientes(nome)')
    .order('criado_em', { ascending: false })

  const todas = (data ?? []) as unknown as Peca[]

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const doMes = todas.filter((c) => new Date(c.criado_em) >= inicioMes)

  const aguardando = todas.filter((c) => c.status === 'aguardando')
  const decididas = todas.filter(
    (c) => c.status === 'aprovado' || c.status === 'publicado' || c.status === 'rascunho',
  )
  const aprovadas = todas.filter(
    (c) => c.status === 'aprovado' || c.status === 'publicado',
  )
  // Taxa sobre o que já foi decidido — peça ainda na fila não conta como
  // reprovada, senão o número despenca só porque ninguém olhou ainda.
  const taxa =
    decididas.length > 0 ? Math.round((aprovadas.length / decididas.length) * 100) : 0

  const custoMes = doMes.reduce((s, c) => s + c.custo_centesimos_usd, 0)
  const custoMedio = doMes.length > 0 ? Math.round(custoMes / doMes.length) : 0

  const contagem = (f: Filtro) =>
    f === 'todos' ? todas.length : todas.filter((c) => c.status === f).length

  const lista =
    filtro === 'todos' ? todas : todas.filter((c) => c.status === (filtro as StatusConteudo))

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Conteúdo gerado"
        meta="Nenhuma peça vai ao ar sem aprovação humana — aprovar aqui libera para o calendário"
        acoes={<BotaoLink href="/conteudo/calendario">Ver calendário</BotaoLink>}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Peças no mês"
          valor={String(doMes.length)}
          acento="azul"
          detalhe={<span>{todas.length} no total</span>}
        />
        <KpiTile
          rotulo="Taxa de aprovação"
          valor={`${taxa}%`}
          acento="verde"
          detalhe={<span>{aprovadas.length} de {decididas.length} decididas</span>}
        />
        <KpiTile
          rotulo="Aguardando você"
          valor={String(aguardando.length)}
          acento={aguardando.length > 0 ? 'ambar' : 'verde'}
          detalhe={
            <span>
              {aguardando.length > 0 ? 'parado até alguém decidir' : 'fila limpa'}
            </span>
          }
        />
        <KpiTile
          rotulo="Custo por peça"
          valor={custoMedio > 0 ? formatCustoUSD(custoMedio) : '—'}
          acento="roxo"
          detalhe={<span>{formatCustoUSD(custoMes)} no mês</span>}
        />
      </div>

      <Painel>
        <div className="mb-4">
          <BarraFiltros contagem={`${lista.length} peça(s)`}>
            {FILTROS.map((f) => (
              <ChipLink key={f} href={url(f)} ativo={filtro === f} scroll={false}>
                {f} · {contagem(f)}
              </ChipLink>
            ))}
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio
            descricao={
              todas.length === 0
                ? 'A geração de conteúdo ainda não escreveu nada — as peças aparecem aqui assim que o primeiro lote rodar.'
                : undefined
            }
            acao={
              filtro !== 'todos' ? (
                <BotaoLink href="/conteudo">Ver todas</BotaoLink>
              ) : undefined
            }
          >
            {todas.length === 0 ? 'Nenhuma peça gerada' : `Nenhuma peça ${filtro}`}
          </Vazio>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((c) => {
              const cor = COR_CANAL[c.canal]
              return (
                <article
                  key={c.id}
                  className={`flex flex-col rounded-card border ${cor.borda} ${cor.fundo} p-4 transition-colors hover:border-azul/45`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tom={TOM_CANAL[c.canal]}>
                      {ROTULO_CANAL_CONTEUDO[c.canal]}
                    </StatusBadge>
                    <StatusBadge
                      tom={TOM_STATUS_CONTEUDO[c.status]}
                      ponto={c.status === 'aguardando'}
                      brilho={c.status === 'aguardando'}
                    >
                      {c.status}
                    </StatusBadge>
                    <span className="ml-auto font-mono text-[9.5px] text-fantasma">
                      {quando(c.criado_em)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-[13.5px] leading-snug font-semibold text-pleno">
                    {c.titulo}
                  </h3>
                  {c.trecho && (
                    <p className="mt-1.5 line-clamp-3 text-[11.5px] text-tenue">
                      {c.trecho}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-borda pt-3 font-mono text-[10px] text-fantasma">
                    <span className="text-tenue">{c.clientes?.nome ?? 'sem cliente'}</span>
                    {c.modelo && <span className="text-azul-claro">{c.modelo}</span>}
                    <span className="ml-auto">
                      {formatCustoUSD(c.custo_centesimos_usd)}
                    </span>
                  </div>

                  {c.status === 'aguardando' && (
                    <div className="mt-3">
                      <AcoesConteudo id={c.id} />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </Painel>
    </div>
  )
}
