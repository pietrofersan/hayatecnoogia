import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FrenteTag } from '@/components/FrenteTag'
import { Painel, Vazio } from '@/components/Painel'
import { StatusChip, StatusContratoChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type { Cliente, Cobranca, Contrato, Lead, Site } from '@/lib/db'
import { ROTULO_MODO, ROTULO_TIPO } from '@/lib/db'
import { formatBRL, formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'
import { formataDocumento } from '@/lib/validacao'

export const dynamic = 'force-dynamic'

/** Ficha 360: contratos, cobranças, leads e sites do cliente. */
export default async function FichaCliente({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await supabaseServidor()

  const [{ data: cliente }, { data: contratos }, { data: cobrancas }, { data: leads }, { data: sites }] =
    await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('contratos').select('*').eq('cliente_id', id).order('criado_em', { ascending: false }),
      supabase
        .from('cobrancas')
        .select('*, contratos!inner(codigo, cliente_id)')
        .eq('contratos.cliente_id', id)
        .order('vencimento', { ascending: false })
        .limit(12),
      supabase.from('leads').select('*').eq('cliente_id', id).order('criado_em', { ascending: false }).limit(8),
      supabase.from('sites').select('*').eq('cliente_id', id),
    ])

  if (!cliente) notFound()
  const c = cliente as Cliente

  return (
    <div className="space-y-6">
      <header>
        <Link href="/clientes" className="text-xs text-apagado hover:text-ink-2">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-marfim">{c.nome}</h1>
        <p className="text-sm text-apagado">
          {formataDocumento(c.documento)} · {c.email ?? '—'} · {c.whatsapp ?? c.telefone ?? '—'}
        </p>
      </header>

      <Painel titulo="Contratos">
        {(contratos ?? []).length === 0 ? (
          <Vazio>Sem contratos.</Vazio>
        ) : (
          <Tabela cabecalho={['Código', 'Frente', 'Tipo', 'Modo', 'Valor', 'Status']}>
            {(contratos as Contrato[]).map((ct) => (
              <Linha key={ct.id}>
                <Celula>
                  <Link href={`/contratos?c=${ct.id}`} className="font-mono text-xs text-tec">
                    {ct.codigo}
                  </Link>
                </Celula>
                <Celula>
                  <FrenteTag frente={ct.frente} />
                </Celula>
                <Celula>{ROTULO_TIPO[ct.tipo] ?? ct.tipo}</Celula>
                <Celula>{ROTULO_MODO[ct.modo]}</Celula>
                <Celula numerica>{formatBRL(Number(ct.valor_centavos))}</Celula>
                <Celula>
                  <StatusContratoChip status={ct.status} />
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <Painel titulo="Cobranças">
        {(cobrancas ?? []).length === 0 ? (
          <Vazio>Sem cobranças.</Vazio>
        ) : (
          <Tabela cabecalho={['Vencimento', 'Contrato', 'Forma', 'Status', 'Valor', '']}>
            {(cobrancas as unknown as (Cobranca & { contratos: { codigo: string } })[]).map((cb) => (
              <Linha key={cb.id}>
                <Celula>{formatData(cb.vencimento)}</Celula>
                <Celula>
                  <span className="font-mono text-xs text-nevoa">{cb.contratos?.codigo}</span>
                </Celula>
                <Celula>{cb.forma ?? '—'}</Celula>
                <Celula>
                  <StatusChip status={cb.status} />
                </Celula>
                <Celula numerica>{formatBRL(Number(cb.valor_centavos))}</Celula>
                <Celula>
                  {cb.url_fatura && (
                    <a
                      href={cb.url_fatura}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-tec hover:underline"
                    >
                      2ª via
                    </a>
                  )}
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Leads">
          {(leads ?? []).length === 0 ? (
            <Vazio>Sem leads deste cliente.</Vazio>
          ) : (
            <ul className="divide-y divide-linha/60">
              {(leads as Lead[]).map((l) => (
                <li key={l.id} className="py-2.5">
                  <p className="text-sm text-marfim">{l.nome ?? 'Sem nome'}</p>
                  <p className="text-xs text-apagado">
                    {l.email ?? l.telefone ?? '—'} · {formatData(l.criado_em)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel titulo="Sites">
          {(sites ?? []).length === 0 ? (
            <Vazio>Nenhum domínio cadastrado.</Vazio>
          ) : (
            <ul className="divide-y divide-linha/60">
              {(sites as Site[]).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-ink-2">{s.dominio}</span>
                  <span className="text-xs text-apagado">{s.host ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      {c.observacoes && (
        <Painel titulo="Observações">
          <p className="text-sm whitespace-pre-wrap text-ink-2">{c.observacoes}</p>
        </Painel>
      )}
    </div>
  )
}
