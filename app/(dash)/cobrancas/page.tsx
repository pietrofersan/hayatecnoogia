import Link from 'next/link'
import { Painel, Vazio } from '@/components/Painel'
import { StatusChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cobranca, StatusCobranca } from '@/lib/db'
import { formatBRL, formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const STATUS: StatusCobranca[] = ['pendente', 'paga', 'vencida', 'cancelada', 'estornada']
const FORMAS = ['PIX', 'BOLETO', 'CREDIT_CARD'] as const

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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-marfim">Cobranças</h1>
        <p className="text-sm text-apagado">
          {cobrancas.length} no filtro · {formatBRL(total)} somados
        </p>
      </header>

      <form className="flex flex-wrap gap-2 text-sm">
        <select
          name="status"
          defaultValue={f.status ?? ''}
          className="rounded-lg border border-linha bg-painel px-3 py-2 text-ink-2 outline-none focus:border-tec"
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
          className="rounded-lg border border-linha bg-painel px-3 py-2 text-ink-2 outline-none focus:border-tec"
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
          className="rounded-lg border border-linha bg-painel px-3 py-2 text-ink-2 outline-none focus:border-tec"
        />
        <input
          type="date"
          name="ate"
          defaultValue={f.ate}
          className="rounded-lg border border-linha bg-painel px-3 py-2 text-ink-2 outline-none focus:border-tec"
        />
        <button className="rounded-lg border border-linha px-3 py-2 text-ink-2 hover:border-nevoa hover:text-marfim">
          Filtrar
        </button>
        <Link href="/cobrancas" className="rounded-lg px-3 py-2 text-apagado hover:text-ink-2">
          Limpar
        </Link>
      </form>

      <Painel>
        {cobrancas.length === 0 ? (
          <Vazio>Nenhuma cobrança encontrada.</Vazio>
        ) : (
          <Tabela
            cabecalho={[
              'Vencimento',
              'Cliente',
              'Contrato',
              'Parcela',
              'Forma',
              'Status',
              'Valor',
              '',
            ]}
          >
            {cobrancas.map((c) => (
              <Linha key={c.id}>
                <Celula>{formatData(c.vencimento)}</Celula>
                <Celula>{c.contratos?.clientes?.nome ?? '—'}</Celula>
                <Celula>
                  <span className="font-mono text-xs text-nevoa">
                    {c.contratos?.codigo ?? '—'}
                  </span>
                </Celula>
                <Celula>{c.parcela ? `${c.parcela}/${c.total_parcelas ?? '—'}` : '—'}</Celula>
                <Celula>{c.forma ?? '—'}</Celula>
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
                      className="text-xs text-tec hover:underline"
                    >
                      2ª via
                    </a>
                  ) : (
                    <span className="text-xs text-apagado">—</span>
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
