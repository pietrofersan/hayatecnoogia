import { BotaoResolver, BotaoResolverTodos } from '@/components/AcoesAlerta'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { Ponto, StatusBadge } from '@/components/StatusBadge'
import {
  listarAlertas,
  resolvidosHoje,
  ROTULO_ORIGEM,
  type Alerta,
  type OrigemAlerta,
} from '@/lib/alertas'

export const dynamic = 'force-dynamic'

const FILTROS = ['todos', 'critico', 'atencao'] as const
type Filtro = (typeof FILTROS)[number]

const ROTULO_FILTRO: Record<Filtro, string> = {
  todos: 'todos',
  critico: 'críticos',
  atencao: 'atenção',
}

function ehFiltro(v: string | undefined): v is Filtro {
  return FILTROS.includes(v as Filtro)
}

function ehOrigem(v: string | undefined): v is OrigemAlerta {
  return v !== undefined && v in ROTULO_ORIGEM
}

function url(filtro: Filtro, origem?: OrigemAlerta) {
  const p = new URLSearchParams()
  if (filtro !== 'todos') p.set('nivel', filtro)
  if (origem) p.set('origem', origem)
  const q = p.toString()
  return q ? `/alertas?${q}` : '/alertas'
}

export default async function Alertas({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string; origem?: string }>
}) {
  const { nivel, origem } = await searchParams
  const filtro: Filtro = ehFiltro(nivel) ? nivel : 'todos'
  const filtroOrigem = ehOrigem(origem) ? origem : undefined

  const [todos, baixadosHoje] = await Promise.all([listarAlertas(), resolvidosHoje()])

  const criticos = todos.filter((a) => a.severidade === 'critico').length
  const atencao = todos.length - criticos

  const lista = todos.filter(
    (a) =>
      (filtro === 'todos' || a.severidade === filtro) &&
      (!filtroOrigem || a.origem === filtroOrigem),
  )

  const porOrigem = new Map<OrigemAlerta, number>()
  for (const a of todos) porOrigem.set(a.origem, (porOrigem.get(a.origem) ?? 0) + 1)

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Central de alertas"
        meta={`${todos.length} pendente(s) · próxima varredura automática às 04:00`}
        acoes={<BotaoResolverTodos chaves={lista.map((a) => a.chave)} />}
      />

      <div className="grid gap-3.5 sm:grid-cols-3">
        <KpiTile
          rotulo="Críticos"
          valor={String(criticos)}
          acento="magenta"
          detalhe={<span>bloqueiam receita ou tiram algo do ar</span>}
        />
        <KpiTile
          rotulo="Atenção"
          valor={String(atencao)}
          acento="ambar"
          detalhe={<span>resolvem-se ainda esta semana</span>}
        />
        <KpiTile
          rotulo="Resolvidos hoje"
          valor={String(baixadosHoje)}
          acento="verde"
          detalhe={<span>baixados pela equipe</span>}
        />
      </div>

      <Painel
        titulo="Pendências"
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {todos.length}
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            {FILTROS.map((f) => (
              <ChipLink
                key={f}
                href={url(f, filtroOrigem)}
                ativo={filtro === f}
                scroll={false}
              >
                {ROTULO_FILTRO[f]} ·{' '}
                {f === 'todos' ? todos.length : f === 'critico' ? criticos : atencao}
              </ChipLink>
            ))}
            {([...porOrigem.entries()] as [OrigemAlerta, number][]).map(([o, n]) => (
              <ChipLink
                key={o}
                href={url(filtro, filtroOrigem === o ? undefined : o)}
                ativo={filtroOrigem === o}
                scroll={false}
              >
                {ROTULO_ORIGEM[o]} · {n}
              </ChipLink>
            ))}
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio
            icone="✓"
            descricao="Próxima varredura automática às 04:00."
            acao={
              filtro !== 'todos' || filtroOrigem ? (
                <BotaoLink href="/alertas">Limpar filtros</BotaoLink>
              ) : undefined
            }
          >
            Nada pendente nesse filtro
          </Vazio>
        ) : (
          <ul className="divide-y divide-azul/[0.07]">
            {lista.map((a) => (
              <LinhaAlerta key={a.chave} alerta={a} />
            ))}
          </ul>
        )}
      </Painel>
    </div>
  )
}

function LinhaAlerta({ alerta }: { alerta: Alerta }) {
  const critico = alerta.severidade === 'critico'

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Ponto tom={critico ? 'magenta' : 'ambar'} pulsa={!critico} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-pleno">{alerta.titulo}</p>
        <p className="mt-0.5 truncate font-mono text-[10.5px] text-tenue">
          {ROTULO_ORIGEM[alerta.origem]} · {alerta.meta}
        </p>
      </div>

      <StatusBadge tom={critico ? 'magenta' : 'ambar'} brilho>
        {critico ? 'crítico' : 'atenção'}
      </StatusBadge>

      <BotaoLink href={alerta.href} variante="secundario">
        Abrir
      </BotaoLink>

      <BotaoResolver chave={alerta.chave} />
    </li>
  )
}
