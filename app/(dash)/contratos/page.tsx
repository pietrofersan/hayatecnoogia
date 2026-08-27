import Link from 'next/link'
import { AcoesContrato } from '@/components/AcoesContrato'
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
  c?: string
}

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

  const [{ data }, { data: clientes }, { data: templates }] = await Promise.all([
    consulta,
    supabase.from('clientes').select('id, nome, email, whatsapp').order('nome'),
    supabase
      .from('templates_contrato')
      .select('id, nome, frente, tipo')
      .eq('ativo', true)
      .order('nome'),
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

  const querystring = (extra: Partial<Filtros>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) p.set(k, String(v))
    const s = p.toString()
    return s ? `/contratos?${s}` : '/contratos'
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-marfim">Contratos</h1>
          <p className="text-sm text-apagado">{contratos.length} no filtro atual</p>
        </div>
        <WizardContrato clientes={listaClientes} templates={listaTemplates} />
      </header>

      <form className="flex flex-wrap gap-2 text-sm">
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
            className="rounded-lg border border-linha bg-painel px-3 py-2 text-sm text-ink-2 outline-none focus:border-tec"
          >
            <option value="">{campo.vazio}</option>
            {campo.opcoes.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        ))}
        <button className="rounded-lg border border-linha px-3 py-2 text-sm text-ink-2 hover:border-nevoa hover:text-marfim">
          Filtrar
        </button>
        <Link
          href="/contratos"
          className="rounded-lg px-3 py-2 text-sm text-apagado hover:text-ink-2"
        >
          Limpar
        </Link>
      </form>

      {selecionado && (
        <Painel
          titulo={`${selecionado.codigo} · ${selecionado.clientes?.nome ?? ''}`}
          acao={
            <Link href={querystring({ c: undefined })} className="text-xs text-apagado hover:text-ink-2">
              fechar ×
            </Link>
          }
        >
          <TimelineContrato status={selecionado.status} />

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-4">
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
                <dt className="text-[11px] tracking-wide text-nevoa uppercase">{rotulo}</dt>
                <dd className="mt-0.5 text-ink-2">{valor}</dd>
              </div>
            ))}
          </dl>

          {selecionado.descricao && (
            <p className="mt-4 text-sm whitespace-pre-wrap text-ink-2">{selecionado.descricao}</p>
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
              <p className="mb-2 text-[11px] tracking-wide text-nevoa uppercase">
                Cobranças do contrato
              </p>
              <Tabela cabecalho={['Vencimento', 'Parcela', 'Status', 'Valor']}>
                {cobrancasDoSelecionado.map((cb) => (
                  <Linha key={cb.id}>
                    <Celula>{formatData(cb.vencimento)}</Celula>
                    <Celula>
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

      <Painel>
        {contratos.length === 0 ? (
          <Vazio>Nenhum contrato com esses filtros.</Vazio>
        ) : (
          <Tabela
            cabecalho={['Código', 'Cliente', 'Frente', 'Tipo', 'Modo', 'Status', 'Valor']}
          >
            {contratos.map((ct) => (
              <Linha key={ct.id}>
                <Celula>
                  <Link
                    href={querystring({ c: ct.id })}
                    scroll={false}
                    className="font-mono text-xs text-tec hover:underline"
                  >
                    {ct.codigo}
                  </Link>
                </Celula>
                <Celula>{ct.clientes?.nome ?? '—'}</Celula>
                <Celula>
                  <FrenteTag frente={ct.frente} />
                </Celula>
                <Celula>{ROTULO_TIPO[ct.tipo] ?? ct.tipo}</Celula>
                <Celula>{ROTULO_MODO[ct.modo]}</Celula>
                <Celula>
                  <StatusContratoChip status={ct.status} />
                </Celula>
                <Celula numerica>{formatBRL(Number(ct.valor_centavos))}</Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Painel>
    </div>
  )
}
