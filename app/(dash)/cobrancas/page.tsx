import Link from 'next/link'
import { BotaoLink } from '@/components/Campo'
import { BarraFiltros, CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { StatusChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cobranca, StatusCobranca } from '@/lib/db'
import { formatBRL, formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS: StatusCobranca[] = ['pendente', 'paga', 'vencida', 'cancelada', 'estornada']
const FORMAS = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const

const CONTROLE =
  'rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3 py-2 text-[12px] text-corpo outline-none focus:border-ciano'

export default async function Cobrancas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; forma?: string; de?: string; ate?: string }>
}) {
  const f = await searchParams
  const supabase = await supabaseServidor()

  let consulta = supabase
    .from('cobrancas')
    .select('*, contratos(codigo, clientes(nome))')
    .order('vencimento', { ascending: false })
    .limit(200)

  if (f.status) consulta = consulta.eq('status', f.status)
  if (f.forma) consulta = consulta.eq('forma', f.forma)
  if (f.de) consulta = consulta.gte('vencimento', f.de)
  if (f.ate) consulta = consulta.lte('vencimento', f.ate)

  const { data } = await consulta
  const cobrancas = (data ?? []) as unknown as (Cobranca & {
    contratos: { codigo: string; clientes: { nome: string } | null } | null
  })[]

  const total = cobrancas.reduce((s, c) => s + Number(c.valor_centavos), 0)
  const somaPor = (alvo: StatusCobranca) =>
    cobrancas
      .filter((c) => c.status === alvo)
      .reduce((s, c) => s + Number(c.valor_centavos), 0)

  function url(status: StatusCobranca | null) {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (f.forma) p.set('forma', f.forma)
    if (f.de) p.set('de', f.de)
    if (f.ate) p.set('ate', f.ate)
    const q = p.toString()
    return q ? `/cobrancas?${q}` : '/cobrancas'
  }

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Cobranças"
        meta={`${cobrancas.length} cobrança(s) no filtro · ${formatBRL(total)} somados`}
        acoes={<BotaoLink href="/contratos">Contratos →</BotaoLink>}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="No filtro"
          valor={formatBRL(total)}
          acento="azul"
          detalhe={<span>{cobrancas.length} cobrança(s)</span>}
        />
        <KpiTile
          rotulo="Pagas"
          valor={formatBRL(somaPor('paga'))}
          acento="verde"
          detalhe={<span>{cobrancas.filter((c) => c.status === 'paga').length} baixadas</span>}
        />
        <KpiTile
          rotulo="Pendentes"
          valor={formatBRL(somaPor('pendente'))}
          acento="ambar"
          detalhe={
            <span>{cobrancas.filter((c) => c.status === 'pendente').length} a vencer</span>
          }
        />
        <KpiTile
          rotulo="Vencidas"
          valor={formatBRL(somaPor('vencida'))}
          acento={somaPor('vencida') > 0 ? 'magenta' : 'verde'}
          detalhe={
            <span>{cobrancas.filter((c) => c.status === 'vencida').length} em atraso</span>
          }
        />
      </div>

      <BarraFiltros>
        <ChipLink href={url(null)} ativo={!f.status} scroll={false}>
          todas · {cobrancas.length}
        </ChipLink>
        {STATUS.map((s) => (
          <ChipLink
            key={s}
            href={url(f.status === s ? null : s)}
            ativo={f.status === s}
            scroll={false}
          >
            {s}
          </ChipLink>
        ))}
      </BarraFiltros>

      <form className="flex flex-wrap gap-2 text-[12.5px]">
        <select
          name="status"
          defaultValue={f.status ?? ''}
          className={CONTROLE}
        >
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          name="forma"
          defaultValue={f.forma ?? ''}
          className={CONTROLE}
        >
          <option value="">Todas as formas</option>
          {FORMAS.map((forma) => (
            <option key={forma} value={forma}>
              {forma === 'CREDIT_CARD' ? 'Cartão' : forma === 'BOLETO' ? 'Boleto' : 'PIX'}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="de"
          defaultValue={f.de}
          className={CONTROLE}
        />
        <input
          type="date"
          name="ate"
          defaultValue={f.ate}
          className={CONTROLE}
        />
        <button className="min-h-[36px] cursor-pointer rounded-btn border border-borda-forte bg-white/[0.03] px-[15px] text-[12.5px] text-suave hover:border-azul/45 hover:text-corpo">
          Filtrar
        </button>
        <Link
          href="/cobrancas"
          className="inline-flex min-h-[36px] items-center px-3 text-[12.5px] text-tenue hover:text-corpo"
        >
          Limpar
        </Link>
      </form>

      <Painel>
        {cobrancas.length === 0 ? (
          <Vazio acao={<BotaoLink href="/cobrancas">Limpar filtros</BotaoLink>}>
            Nenhuma cobrança com esses filtros
          </Vazio>
        ) : (
          <Tabela
            cabecalho={[
              'Vencimento',
              'Cliente',
              'Contrato',
              'Parcela',
              'Forma',
              'Situação',
              { rotulo: 'Valor', numerica: true },
              '',
            ]}
            minima="56rem"
          >
            {cobrancas.map((c) => (
              <Linha key={c.id}>
                <Celula mono>{formatData(c.vencimento)}</Celula>
                <Celula>{c.contratos?.clientes?.nome ?? '—'}</Celula>
                <Celula mono>{c.contratos?.codigo ?? '—'}</Celula>
                <Celula mono>
                  {c.parcela ? `${c.parcela}/${c.total_parcelas ?? '—'}` : '—'}
                </Celula>
                <Celula mono>{c.forma ?? '—'}</Celula>
                <Celula>
                  <StatusChip status={c.status} />
                </Celula>
                <Celula numerica>{formatBRL(Number(c.valor_centavos))}</Celula>
                <Celula>
                  {c.url_fatura ? (
                    <a
                      href={c.url_fatura}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-ciano hover:underline"
                    >
                      2ª via
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-fantasma">—</span>
                  )}
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>
    </div>
  )
}
