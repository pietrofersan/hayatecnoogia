import { BotaoChecarRadar } from '@/components/BotaoChecarRadar'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { Painel, Vazio } from '@/components/Painel'
import { Ponto, StatusBadge, type TomBadge } from '@/components/StatusBadge'
import { ROTULO_CANAL } from '@/lib/crm'
import type { CanalCrm } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Situacao = 'funcionando' | 'aguardando' | 'falhou' | 'desligada'

const TOM: Record<Situacao, TomBadge> = {
  funcionando: 'verde',
  aguardando: 'ambar',
  falhou: 'magenta',
  desligada: 'neutro',
}

const ROTULO: Record<Situacao, string> = {
  funcionando: 'funcionando',
  aguardando: 'aguardando',
  falhou: 'falhou',
  desligada: 'desligada',
}

type Integracao = {
  chave: string
  sigla: string
  nome: string
  escopo: string
  situacao: Situacao
  ultima: string
  nota: string
  destino: string
}

/** As rotinas noturnas declaradas em vercel.json, na ordem em que rodam. */
const PIPELINE = [
  { hora: '06:00', passo: 'Radar de domínios', rota: '/api/cron/radar-dominios' },
  { hora: '08:00', passo: 'Vencimentos e régua Asaas', rota: '/api/cron/vencimentos' },
  { hora: '08:00', passo: 'Resumo semanal (segundas)', rota: '/api/cron/resumo-semanal' },
] as const

function quando(iso: string | null | undefined): string {
  if (!iso) return 'nunca executou'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 6e4)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.round(min / 60)} h`
  return `há ${Math.round(min / 1440)} d`
}

export default async function Integracoes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await supabaseServidor()
  const ha24h = new Date(Date.now() - 864e5).toISOString()

  const [{ data: hooks }, { data: canais }, { data: radar }] = await Promise.all([
    supabase
      .from('webhook_logs')
      .select('id, origem, evento, erro, processado, recebido_em')
      .gte('recebido_em', ha24h)
      .order('recebido_em', { ascending: false })
      .limit(200),
    supabase
      .from('channel_accounts')
      .select('id, channel, display_name, external_id, status, updated_at'),
    supabase
      .from('dominios_radar')
      .select('checado_em')
      .not('checado_em', 'is', null)
      .order('checado_em', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  type Hook = {
    id: number
    origem: string
    evento: string | null
    erro: string | null
    processado: boolean
    recebido_em: string
  }
  type Canal = {
    id: string
    channel: CanalCrm
    display_name: string | null
    external_id: string
    status: string
    updated_at: string
  }

  const logs = (hooks ?? []) as Hook[]
  const contas = (canais ?? []) as Canal[]

  /** Um webhook é a integração: o estado vem do último evento em 24h. */
  function porOrigem(origem: string): { ultimo: Hook | null; erros: number; total: number } {
    const doTipo = logs.filter((l) => l.origem === origem)
    return {
      ultimo: doTipo[0] ?? null,
      erros: doTipo.filter((l) => l.erro).length,
      total: doTipo.length,
    }
  }

  function situacaoWebhook(o: ReturnType<typeof porOrigem>): Situacao {
    if (o.erros > 0) return 'falhou'
    if (o.total === 0) return 'aguardando'
    return 'funcionando'
  }

  const asaas = porOrigem('asaas')
  const zapsign = porOrigem('zapsign')
  const leadform = porOrigem('leadform')

  const integracoes: Integracao[] = [
    {
      chave: 'asaas',
      sigla: 'AS',
      nome: 'Asaas',
      escopo: 'cobrança recorrente, régua e baixa automática',
      situacao: situacaoWebhook(asaas),
      ultima: quando(asaas.ultimo?.recebido_em),
      nota: `${asaas.total} evento(s) em 24 h · ${asaas.erros} com erro`,
      destino: '/cobrancas',
    },
    {
      chave: 'zapsign',
      sigla: 'ZS',
      nome: 'ZapSign',
      escopo: 'assinatura eletrônica dos contratos',
      situacao: situacaoWebhook(zapsign),
      ultima: quando(zapsign.ultimo?.recebido_em),
      nota: `${zapsign.total} evento(s) em 24 h · ${zapsign.erros} com erro`,
      destino: '/contratos',
    },
    {
      chave: 'leadform',
      sigla: 'LF',
      nome: 'Formulários das landings',
      escopo: 'ingresso de leads por site_key',
      situacao: situacaoWebhook(leadform),
      ultima: quando(leadform.ultimo?.recebido_em),
      nota: `${leadform.total} lead(s) em 24 h · ${leadform.erros} com erro`,
      destino: '/leads',
    },
    {
      chave: 'radar',
      sigla: 'RD',
      nome: 'Radar de domínios (RDAP)',
      escopo: 'disponibilidade e vencimento dos domínios vigiados',
      situacao: radar?.checado_em ? 'funcionando' : 'aguardando',
      ultima: quando(radar?.checado_em),
      nota: 'roda todo dia às 06:00 pelo cron da Vercel',
      destino: '/dominios',
    },
    ...contas.map((c): Integracao => {
      const situacao: Situacao =
        c.status === 'connected' || c.status === 'active'
          ? 'funcionando'
          : c.status === 'pending'
            ? 'aguardando'
            : c.status === 'disabled'
              ? 'desligada'
              : 'falhou'
      return {
        chave: `canal:${c.id}`,
        sigla: ROTULO_CANAL[c.channel].slice(0, 2).toUpperCase(),
        nome: c.display_name ?? ROTULO_CANAL[c.channel],
        escopo: `canal do OmniCRM · ${ROTULO_CANAL[c.channel]}`,
        situacao,
        ultima: quando(c.updated_at),
        nota: c.external_id,
        destino: '/crm',
      }
    }),
  ]

  const contagem = (s: Situacao) => integracoes.filter((i) => i.situacao === s).length
  const filtro = (['funcionando', 'aguardando', 'falhou', 'desligada'] as Situacao[]).find(
    (s) => s === status,
  )
  const lista = filtro ? integracoes.filter((i) => i.situacao === filtro) : integracoes

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Integrações e coleta"
        meta={`${integracoes.length} integração(ões) · ${logs.length} evento(s) de webhook nas últimas 24 h`}
        acoes={<BotaoChecarRadar />}
      />

      <Painel
        titulo="Pipeline da madrugada"
        nota="Rotinas agendadas em vercel.json — horários em UTC-3"
      >
        <div className="grid gap-2.5 sm:grid-cols-3">
          {PIPELINE.map((p) => (
            <div
              key={p.rota}
              className="rounded-ctrl border border-borda bg-white/[0.02] px-3.5 py-3"
            >
              <p className="font-mono text-[10px] tracking-[0.2em] text-fantasma uppercase">
                {p.hora}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[12.5px] text-pleno">
                <Ponto tom="ciano" />
                {p.passo}
              </p>
              <p className="mt-1 font-mono text-[10px] text-tenue">{p.rota}</p>
            </div>
          ))}
        </div>
      </Painel>

      <Painel
        titulo="Integrações"
        acao={
          <span className="font-mono text-[10.5px] text-fantasma">
            {lista.length} de {integracoes.length}
          </span>
        }
      >
        <div className="mb-4">
          <BarraFiltros>
            <ChipLink href="/integracoes" ativo={!filtro} scroll={false}>
              todas · {integracoes.length}
            </ChipLink>
            {(['funcionando', 'aguardando', 'falhou', 'desligada'] as Situacao[])
              .filter((s) => contagem(s) > 0)
              .map((s) => (
                <ChipLink
                  key={s}
                  href={filtro === s ? '/integracoes' : `/integracoes?status=${s}`}
                  ativo={filtro === s}
                  scroll={false}
                >
                  {ROTULO[s]} · {contagem(s)}
                </ChipLink>
              ))}
          </BarraFiltros>
        </div>

        {lista.length === 0 ? (
          <Vazio acao={<BotaoLink href="/integracoes">Ver todas</BotaoLink>}>
            Nenhuma integração nesse filtro
          </Vazio>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((i) => (
              <article
                key={i.chave}
                className="rounded-card border border-borda bg-white/[0.02] p-[18px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid size-9 place-items-center rounded-ctrl border border-borda-forte bg-white/5 font-mono text-[11px] font-semibold text-azul-claro"
                    >
                      {i.sigla}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-pleno">
                        {i.nome}
                      </p>
                      <p className="truncate text-[11px] text-tenue">{i.escopo}</p>
                    </div>
                  </div>
                  <StatusBadge
                    tom={TOM[i.situacao]}
                    ponto={i.situacao === 'aguardando'}
                    brilho
                  >
                    {ROTULO[i.situacao]}
                  </StatusBadge>
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-borda pt-3 font-mono text-[10.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-fantasma">última execução</dt>
                    <dd className="text-mono">{i.ultima}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-fantasma">nota</dt>
                    <dd className="truncate text-tenue">{i.nota}</dd>
                  </div>
                </dl>

                <div className="mt-3.5">
                  <BotaoLink href={i.destino} variante="secundario">
                    Abrir módulo
                  </BotaoLink>
                </div>
              </article>
            ))}
          </div>
        )}
      </Painel>

      <Painel titulo="Webhooks · 24 h" nota="Últimos eventos recebidos, do mais novo">
        {logs.length === 0 ? (
          <Vazio>Nenhum webhook nas últimas 24 horas</Vazio>
        ) : (
          <ul className="divide-y divide-azul/[0.07]">
            {logs.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <Ponto tom={l.erro ? 'magenta' : l.processado ? 'verde' : 'ambar'} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-pleno">
                  {l.origem} · {l.evento ?? 'sem evento'}
                </span>
                <span className="font-mono text-[10.5px] text-tenue">
                  {quando(l.recebido_em)}
                </span>
                <StatusBadge tom={l.erro ? 'magenta' : l.processado ? 'verde' : 'ambar'}>
                  {l.erro ? 'falhou' : l.processado ? 'processado' : 'na fila'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </div>
  )
}
