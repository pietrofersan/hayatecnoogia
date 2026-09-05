import Link from 'next/link'
import { AcoesContrato } from '@/components/AcoesContrato'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Ponto, StatusBadge } from '@/components/StatusBadge'
import type { ClienteResumo, TemplateResumo } from '@/components/CamposContrato'
import { FormContratoRascunho } from '@/components/FormContratoRascunho'
import { FrenteTag } from '@/components/FrenteTag'
import { Painel, Vazio } from '@/components/Painel'
import { StatusChip, StatusContratoChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { TimelineContrato } from '@/components/TimelineContrato'
import { WizardContrato } from '@/components/WizardContrato'
import type { Cobranca, Contrato } from '@/lib/db'
import { FRENTES, ROTULO_FRENTE, ROTULO_MODO, ROTULO_TIPO, TIPOS_CONTRATO } from '@/lib/db'
import { formatBRL, formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Filtros = {
  frente?: string
  tipo?: string
  modo?: string
  assinatura?: string
  situacao?: string
  c?: string
}

const CONTROLE =
  'rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3 py-2 text-[12px] text-corpo outline-none focus:border-ciano'

/** Régua de cobrança do Asaas — o que o cron de vencimentos dispara. */
const REGUA = [
  { quando: 'D+1', passo: 'Lembrete no WhatsApp', tom: 'azul' as const },
  { quando: 'D+3', passo: 'Segunda via da fatura', tom: 'ciano' as const },
  { quando: 'D+7', passo: 'Alerta ao gestor da conta', tom: 'ambar' as const },
  { quando: 'D+15', passo: 'Suspensão do serviço', tom: 'magenta' as const },
]

export default async function Contratos({
  searchParams,
}: {
  searchParams: Promise<Filtros>
}) {
  const f = await searchParams
  const supabase = await supabaseServidor()

  let consulta = supabase
    .from('contratos')
    .select('*, clientes(nome)')
    .order('criado_em', { ascending: false })

  if (f.frente) consulta = consulta.eq('frente', f.frente)
  if (f.tipo) consulta = consulta.eq('tipo', f.tipo)
  if (f.modo) consulta = consulta.eq('modo', f.modo)
  if (f.assinatura === 'pendente') consulta = consulta.in('status', ['rascunho', 'enviado'])
  if (f.assinatura === 'assinado') consulta = consulta.in('status', ['assinado', 'ativo'])

  const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const hoje = new Date().toISOString().slice(0, 10)
  const ha24h = new Date(Date.now() - 864e5).toISOString()

  const [
    { data },
    { data: clientes },
    { data: templates },
    { data: cobrancas },
    { data: hooks },
  ] = await Promise.all([
    consulta,
    supabase.from('clientes').select('id, nome, email, whatsapp').order('nome'),
    supabase
      .from('templates_contrato')
      .select('id, nome, frente, tipo')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('cobrancas')
      .select('valor_centavos, status, vencimento, contrato_id')
      .in('status', ['pendente', 'vencida']),
    supabase
      .from('webhook_logs')
      .select('evento')
      .eq('origem', 'asaas')
      .gte('recebido_em', ha24h),
  ])

  const contratos = (data ?? []) as unknown as (Contrato & {
    clientes: { nome: string } | null
  })[]
  const listaClientes = (clientes ?? []) as ClienteResumo[]
  const listaTemplates = (templates ?? []) as TemplateResumo[]

  const selecionado = f.c ? contratos.find((ct) => ct.id === f.c) : undefined
  let cobrancasDoSelecionado: Cobranca[] = []
  if (selecionado) {
    const { data: cbs } = await supabase
      .from('cobrancas')
      .select('*')
      .eq('contrato_id', selecionado.id)
      .order('vencimento')
    cobrancasDoSelecionado = (cbs ?? []) as Cobranca[]
  }

  type CobResumo = {
    valor_centavos: number
    status: string
    vencimento: string
    contrato_id: string
  }
  const listaCob = (cobrancas ?? []) as CobResumo[]

  const ativos = contratos.filter((c) => c.status === 'ativo')
  const mrr = ativos
    .filter((c) => c.modo === 'recorrente')
    .reduce((s, c) => s + Number(c.valor_centavos), 0)
  const aVencer = listaCob
    .filter((c) => c.status === 'pendente' && c.vencimento >= hoje && c.vencimento <= em30)
    .reduce((s, c) => s + Number(c.valor_centavos), 0)
  const emAtraso = listaCob
    .filter((c) => c.status === 'vencida')
    .reduce((s, c) => s + Number(c.valor_centavos), 0)
  const ticket = ativos.length > 0 ? Math.round(mrr / ativos.length) : 0

  /** Situação por contrato, derivada das cobranças em aberto. */
  const situacaoDe = (id: string): 'em atraso' | 'a vencer' | 'em dia' => {
    const minhas = listaCob.filter((c) => c.contrato_id === id)
    if (minhas.some((c) => c.status === 'vencida')) return 'em atraso'
    if (minhas.some((c) => c.status === 'pendente' && c.vencimento <= em30))
      return 'a vencer'
    return 'em dia'
  }

  const eventosAsaas = new Map<string, number>()
  for (const h of (hooks ?? []) as { evento: string | null }[]) {
    const chave = h.evento ?? 'sem evento'
    eventosAsaas.set(chave, (eventosAsaas.get(chave) ?? 0) + 1)
  }

  const querystring = (extra: Partial<Filtros>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v))
    const s = p.toString()
    return s ? `/contratos?${s}` : '/contratos'
  }

  const situacao = ['em dia', 'a vencer', 'em atraso'].find((s) => s === f.situacao)
  const visiveis = situacao
    ? contratos.filter((c) => situacaoDe(c.id) === situacao)
    : contratos
  const contaSituacao = (alvo: string) =>
    contratos.filter((c) => situacaoDe(c.id) === alvo).length

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Contratos e cobrança"
        meta={`${contratos.length} contrato(s) no filtro · ${ativos.length} ativo(s)`}
        acoes={<WizardContrato clientes={listaClientes} templates={listaTemplates} />}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Receita recorrente"
          valor={formatBRL(mrr)}
          acento="azul"
          detalhe={<span>{ativos.length} contrato(s) ativo(s)</span>}
        />
        <KpiTile
          rotulo="A vencer · 30 d"
          valor={formatBRL(aVencer)}
          acento="roxo"
          detalhe={<span>cobranças pendentes na janela</span>}
        />
        <KpiTile
          rotulo="Em atraso"
          valor={formatBRL(emAtraso)}
          acento={emAtraso > 0 ? 'magenta' : 'verde'}
          detalhe={
            <span>{listaCob.filter((c) => c.status === 'vencida').length} cobrança(s)</span>
          }
        />
        <KpiTile
          rotulo="Ticket médio"
          valor={formatBRL(ticket)}
          acento="ciano"
          detalhe={<span>por contrato ativo</span>}
        />
      </div>

      <BarraFiltros contagem={`${visiveis.length} de ${contratos.length}`}>
        <ChipLink
          href={querystring({ situacao: undefined })}
          ativo={!situacao}
          scroll={false}
        >
          todos · {contratos.length}
        </ChipLink>
        {(['em dia', 'a vencer', 'em atraso'] as const).map((s) => (
          <ChipLink
            key={s}
            href={querystring({ situacao: situacao === s ? undefined : s })}
            ativo={situacao === s}
            scroll={false}
          >
            {s} · {contaSituacao(s)}
          </ChipLink>
        ))}
      </BarraFiltros>

      <form className="flex flex-wrap gap-2 text-[12.5px]">
        {[
          { nome: 'frente', vazio: 'Todas as frentes', opcoes: FRENTES.map((v) => [v, ROTULO_FRENTE[v]] as const) },
          { nome: 'tipo', vazio: 'Todos os tipos', opcoes: TIPOS_CONTRATO.map((v) => [v, ROTULO_TIPO[v]] as const) },
          {
            nome: 'modo',
            vazio: 'Todos os modos',
            opcoes: [
              ['recorrente', 'Recorrente'],
              ['parcelado', 'Parcelado'],
              ['avulso', 'Avulso'],
            ] as const,
          },
          {
            nome: 'assinatura',
            vazio: 'Qualquer assinatura',
            opcoes: [
              ['pendente', 'Aguardando assinatura'],
              ['assinado', 'Assinado'],
            ] as const,
          },
        ].map((campo) => (
          <select
            key={campo.nome}
            name={campo.nome}
            defaultValue={(f as Record<string, string | undefined>)[campo.nome] ?? ''}
            className={CONTROLE}
          >
            <option value="">{campo.vazio}</option>
            {campo.opcoes.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        ))}
        <button className="min-h-[36px] cursor-pointer rounded-btn border border-borda-forte bg-white/[0.03] px-[15px] text-[12.5px] text-suave hover:border-azul/45 hover:text-corpo">
          Filtrar
        </button>
        <Link
          href="/contratos"
          className="inline-flex min-h-[36px] items-center px-3 text-[12.5px] text-tenue hover:text-corpo"
        >
          Limpar
        </Link>
      </form>

      {selecionado && (
        <Painel
          titulo={`${selecionado.codigo} · ${selecionado.clientes?.nome ?? ''}`}
          acao={
            <Link
              href={querystring({ c: undefined })}
              className="font-mono text-[11px] text-tenue hover:text-corpo"
            >
              fechar ×
            </Link>
          }
        >
          <TimelineContrato status={selecionado.status} />

          <dl className="mt-6 grid gap-4 sm:grid-cols-4">
            {[
              ['Frente', ROTULO_FRENTE[selecionado.frente]],
              ['Tipo', ROTULO_TIPO[selecionado.tipo] ?? selecionado.tipo],
              ['Modo', ROTULO_MODO[selecionado.modo]],
              [
                selecionado.modo === 'recorrente' ? 'Mensalidade' : 'Valor total',
                formatBRL(Number(selecionado.valor_centavos)),
              ],
              ['Vencimento', selecionado.dia_vencimento ? `dia ${selecionado.dia_vencimento}` : '—'],
              ['Reajuste', selecionado.indice_reajuste ?? '—'],
              ['Vigência', `${formatData(selecionado.inicio)} → ${formatData(selecionado.fim)}`],
              ['ZapSign', selecionado.zapsign_status ?? '—'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
                  {rotulo}
                </dt>
                <dd className="mt-1 font-mono text-[11.5px] text-mono">{valor}</dd>
              </div>
            ))}
          </dl>

          {selecionado.descricao && (
            <p className="mt-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-corpo">{selecionado.descricao}</p>
          )}

          <div className="mt-5 flex flex-wrap items-start gap-2">
            <AcoesContrato contratoId={selecionado.id} status={selecionado.status} />
            {selecionado.status === 'rascunho' && (
              <FormContratoRascunho
                contrato={selecionado}
                clientes={listaClientes}
                templates={listaTemplates}
              />
            )}
          </div>

          {cobrancasDoSelecionado.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
                Cobranças do contrato
              </p>
              <Tabela
                cabecalho={[
                  'Vencimento',
                  'Parcela',
                  'Situação',
                  { rotulo: 'Valor', numerica: true },
                ]}
              >
                {cobrancasDoSelecionado.map((cb) => (
                  <Linha key={cb.id}>
                    <Celula mono>{formatData(cb.vencimento)}</Celula>
                    <Celula mono>
                      {cb.parcela ? `${cb.parcela}/${cb.total_parcelas ?? '—'}` : '—'}
                    </Celula>
                    <Celula>
                      <StatusChip status={cb.status} />
                    </Celula>
                    <Celula numerica>{formatBRL(Number(cb.valor_centavos))}</Celula>
                  </Linha>
                ))}
              </Tabela>
            </div>
          )}
        </Painel>
      )}

      <div className="grid gap-3.5 xl:grid-cols-[1.55fr_1fr]">
        <Painel>
          {visiveis.length === 0 ? (
            <Vazio acao={<BotaoLink href="/contratos">Limpar filtros</BotaoLink>}>
              Nenhum contrato com esses filtros
            </Vazio>
          ) : (
            <Tabela
              cabecalho={[
                'Código',
                'Cliente',
                'Frente',
                'Tipo',
                'Situação',
                'Assinatura',
                { rotulo: 'Valor', numerica: true },
              ]}
              minima="56rem"
            >
              {visiveis.map((ct) => {
                const sit = situacaoDe(ct.id)
                return (
                  <Linha key={ct.id}>
                    <Celula>
                      <Link
                        href={querystring({ c: ct.id })}
                        scroll={false}
                        className="font-mono text-[11.5px] text-ciano hover:underline"
                      >
                        {ct.codigo}
                      </Link>
                    </Celula>
                    <Celula>{ct.clientes?.nome ?? '—'}</Celula>
                    <Celula>
                      <FrenteTag frente={ct.frente} />
                    </Celula>
                    <Celula>
                      {ROTULO_TIPO[ct.tipo] ?? ct.tipo}
                      <span className="block font-mono text-[10px] text-fantasma">
                        {ROTULO_MODO[ct.modo]}
                      </span>
                    </Celula>
                    <Celula>
                      <StatusBadge
                        tom={
                          sit === 'em atraso'
                            ? 'magenta'
                            : sit === 'a vencer'
                              ? 'ambar'
                              : 'verde'
                        }
                      >
                        {sit}
                      </StatusBadge>
                    </Celula>
                    <Celula>
                      <StatusContratoChip status={ct.status} />
                    </Celula>
                    <Celula numerica>{formatBRL(Number(ct.valor_centavos))}</Celula>
                  </Linha>
                )
              })}
            </Tabela>
          )}
        </Painel>

        <div className="space-y-3.5">
          <Painel
            titulo="Régua de cobrança Asaas"
            nota="Disparada pelo cron de vencimentos, todo dia às 08:00"
          >
            <ul className="divide-y divide-azul/[0.07]">
              {REGUA.map((r) => (
                <li key={r.quando} className="flex items-center gap-3 py-2.5">
                  <Ponto tom={r.tom} />
                  <span className="w-10 shrink-0 font-mono text-[10.5px] text-fantasma">
                    {r.quando}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-corpo">
                    {r.passo}
                  </span>
                </li>
              ))}
            </ul>
          </Painel>

          <Painel titulo="Webhook Asaas · 24 h">
            {eventosAsaas.size === 0 ? (
              <Vazio>Nenhum evento do Asaas nas últimas 24 horas</Vazio>
            ) : (
              <ul className="divide-y divide-azul/[0.07]">
                {[...eventosAsaas.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([evento, qtd]) => (
                    <li
                      key={evento}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-mono">
                        {evento}
                      </span>
                      <span className="tabular font-mono text-[12px] text-pleno">{qtd}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Painel>
        </div>
      </div>
    </div>
  )
}
