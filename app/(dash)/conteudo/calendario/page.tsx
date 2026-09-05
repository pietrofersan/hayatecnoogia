import { AcoesConteudo } from '@/components/AcoesConteudo'
import { BotaoLink } from '@/components/Campo'
import { CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { Painel, Vazio } from '@/components/Painel'
import { Ponto, StatusBadge } from '@/components/StatusBadge'
import {
  COR_CANAL,
  DIAS_CURTOS,
  formatDiaMes,
  segundaDaSemana,
  somarDias,
  TOM_CANAL,
  TOM_STATUS_CONTEUDO,
} from '@/lib/conteudo'
import type { CanalConteudo, Conteudo } from '@/lib/db'
import { CANAIS_CONTEUDO, ROTULO_CANAL_CONTEUDO } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Peca = Conteudo & { clientes: { nome: string } | null }

function ehCanal(v: string): v is CanalConteudo {
  return CANAIS_CONTEUDO.includes(v as CanalConteudo)
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; off?: string }>
}) {
  const { semana, off } = await searchParams

  const deslocamento = Number.parseInt(semana ?? '0', 10) || 0
  const desligados = new Set((off ?? '').split(',').filter(ehCanal))

  const segunda = somarDias(segundaDaSemana(new Date()), deslocamento * 7)
  const domingo = somarDias(segunda, 6)
  const fimExclusivo = somarDias(segunda, 7)

  const supabase = await supabaseServidor()
  const [{ data: naSemana }, { data: naFila }] = await Promise.all([
    supabase
      .from('conteudos')
      .select('*, clientes(nome)')
      .gte('publicar_em', segunda.toISOString())
      .lt('publicar_em', fimExclusivo.toISOString())
      .order('publicar_em'),
    supabase
      .from('conteudos')
      .select('*, clientes(nome)')
      .eq('status', 'aguardando')
      .order('publicar_em', { nullsFirst: false })
      .limit(4),
  ])

  const todasDaSemana = (naSemana ?? []) as unknown as Peca[]
  const fila = (naFila ?? []) as unknown as Peca[]
  const posts = todasDaSemana.filter((p) => !desligados.has(p.canal))

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  /** URL preservando o outro filtro. */
  function url(patch: { semana?: number; canal?: CanalConteudo }) {
    const p = new URLSearchParams()
    const s = patch.semana ?? deslocamento
    if (s !== 0) p.set('semana', String(s))

    const novos = new Set(desligados)
    if (patch.canal) {
      if (novos.has(patch.canal)) novos.delete(patch.canal)
      else novos.add(patch.canal)
    }
    if (novos.size > 0) p.set('off', [...novos].join(','))

    const q = p.toString()
    return q ? `/conteudo/calendario?${q}` : '/conteudo/calendario'
  }

  const dias = Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(segunda, i)
    return {
      data,
      ehHoje: data.getTime() === hoje.getTime(),
      posts: posts.filter((p) => {
        if (!p.publicar_em) return false
        const d = new Date(p.publicar_em)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === data.getTime()
      }),
    }
  })

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Calendário de publicação"
        meta={`Semana de ${formatDiaMes(segunda)} a ${formatDiaMes(domingo)} de ${domingo.getFullYear()} · ${posts.length} publicaç${posts.length === 1 ? 'ão' : 'ões'} · nenhum post sai sem aprovação humana`}
        acoes={
          <>
            <BotaoLink href={url({ semana: deslocamento - 1 })} scroll={false}>
              ‹
            </BotaoLink>
            <BotaoLink href={url({ semana: 0 })} scroll={false}>
              Semana atual
            </BotaoLink>
            <BotaoLink href={url({ semana: deslocamento + 1 })} scroll={false}>
              ›
            </BotaoLink>
            <BotaoLink href="/conteudo" variante="primario">
              Ver peças
            </BotaoLink>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {CANAIS_CONTEUDO.map((c) => (
          <ChipLink
            key={c}
            href={url({ canal: c })}
            ativo={!desligados.has(c)}
            scroll={false}
          >
            {ROTULO_CANAL_CONTEUDO[c]} ·{' '}
            {todasDaSemana.filter((p) => p.canal === c).length}
          </ChipLink>
        ))}
      </div>

      <Painel>
        {posts.length === 0 ? (
          <Vazio
            descricao={
              todasDaSemana.length > 0
                ? 'Todos os canais desta semana estão desligados nos filtros acima.'
                : 'Nada programado nesta semana — use ‹ › para navegar ou programe uma peça em Conteúdo gerado.'
            }
          >
            {todasDaSemana.length > 0
              ? 'Nenhum post com esses canais'
              : 'Semana sem publicação'}
          </Vazio>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <div className="grid min-w-[64rem] grid-cols-7 gap-[9px]">
              {dias.map(({ data, ehHoje, posts: doDia }) => (
                <div key={data.toISOString()} className="min-w-0">
                  <div className="mb-2 flex items-baseline gap-1.5">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-fantasma uppercase">
                      {DIAS_CURTOS[(data.getDay() + 6) % 7]}
                    </span>
                    <span
                      className={
                        ehHoje
                          ? 'rounded-chip bg-ciano/15 px-2 py-0.5 font-mono text-[10.5px] text-ciano-claro'
                          : 'font-mono text-[10.5px] text-tenue'
                      }
                    >
                      {formatDiaMes(data)}
                    </span>
                  </div>

                  {doDia.length === 0 ? (
                    <div className="rounded-card border border-dashed border-borda px-3 py-6 text-center font-mono text-[10.5px] text-fantasma">
                      livre
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {doDia.map((p) => {
                        const cor = COR_CANAL[p.canal]
                        return (
                          <article
                            key={p.id}
                            className={`rounded-card border ${cor.borda} ${cor.fundo} p-2.5`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Ponto tom={TOM_STATUS_CONTEUDO[p.status]} />
                              <span className={`font-mono text-[10.5px] ${cor.texto}`}>
                                {p.publicar_em ? hora(p.publicar_em) : '—'}
                              </span>
                            </div>
                            <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-snug text-corpo">
                              {p.titulo}
                            </p>
                            <p className="mt-1 font-mono text-[9.5px] text-fantasma">
                              {p.clientes?.nome ?? 'sem cliente'}
                            </p>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Painel>

      <Painel
        acento={fila.length > 0 ? 'ambar' : 'nenhum'}
        titulo="Fila de aprovação humana"
        nota={
          fila.length > 0
            ? `${fila.length} peça(s) paradas até alguém decidir`
            : undefined
        }
      >
        {fila.length === 0 ? (
          <Vazio>Fila limpa · nada aguardando aprovação</Vazio>
        ) : (
          <ul className="space-y-2.5">
            {fila.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-borda bg-white/[0.02] p-3"
              >
                <StatusBadge tom={TOM_CANAL[p.canal]}>
                  {ROTULO_CANAL_CONTEUDO[p.canal]}
                </StatusBadge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] text-corpo">{p.titulo}</p>
                  <p className="font-mono text-[9.5px] text-fantasma">
                    {p.clientes?.nome ?? 'sem cliente'}
                    {p.publicar_em &&
                      ` · ${formatDiaMes(new Date(p.publicar_em))} ${hora(p.publicar_em)}`}
                  </p>
                </div>
                <AcoesConteudo id={p.id} compacto />
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  )
}
