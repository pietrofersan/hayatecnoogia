import Link from 'next/link'
import { AcoesRelatorio } from '@/components/AcoesRelatorio'
import { Anel } from '@/components/Anel'
import { Avatar } from '@/components/Avatar'
import { BarRow } from '@/components/BarRow'
import { CabecalhoTela } from '@/components/CabecalhoTela'
import { ChipLink } from '@/components/Chip'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge } from '@/components/StatusBadge'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { CORES_FRENTE } from '@/components/FrenteTag'
import { ROTULO_CANAL } from '@/lib/crm'
import { ROTULO_FRENTE } from '@/lib/db'
import { formatBRL, formatBRLCompacto } from '@/lib/money'
import { montarRelatorio, SECOES, type SecaoRelatorio } from '@/lib/relatorio'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function ligadas(param: string | undefined): Set<SecaoRelatorio> {
  if (param === undefined) return new Set(SECOES.map((s) => s.chave))
  const pedidas = new Set(param.split(',').filter(Boolean))
  return new Set(SECOES.map((s) => s.chave).filter((c) => pedidas.has(c)))
}

function alternar(atuais: Set<SecaoRelatorio>, chave: SecaoRelatorio): string {
  const proximas = new Set(atuais)
  if (proximas.has(chave)) proximas.delete(chave)
  else proximas.add(chave)
  return [...proximas].join(',')
}

export default async function RelatorioMensal({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; mes?: string; secoes?: string }>
}) {
  const { cliente: clienteId, mes, secoes } = await searchParams
  const supabase = await supabaseServidor()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome')

  const lista = (clientes ?? []) as { id: string; nome: string }[]
  const escolhido = clienteId ?? lista[0]?.id
  const relatorio = escolhido ? await montarRelatorio(escolhido, mes) : null
  const on = ligadas(secoes)

  function url(patch: { cliente?: string; secoes?: string }) {
    const p = new URLSearchParams()
    p.set('cliente', patch.cliente ?? escolhido ?? '')
    if (mes) p.set('mes', mes)
    const s = patch.secoes ?? (secoes ?? [...on].join(','))
    if (s) p.set('secoes', s)
    return `/relatorio?${p.toString()}`
  }

  const resumo = relatorio
    ? [
        `Relatório de ${relatorio.mes.rotulo} — ${relatorio.cliente.nome}`,
        `Receita paga no mês: ${formatBRL(relatorio.receita.pagoCentavos)}`,
        `Leads: ${relatorio.leads.total} (${relatorio.leads.respondidos} respondidos)`,
        `Conversas abertas: ${relatorio.conversas.abertas}`,
        `Saúde da conta: ${relatorio.saude}%`,
      ].join('\n')
    : ''

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="Relatório mensal"
        meta={
          relatorio
            ? `${relatorio.cliente.nome} · ${relatorio.mes.rotulo}`
            : 'Escolha um cliente para montar o relatório'
        }
        acoes={
          relatorio && (
            <AcoesRelatorio
              clienteId={relatorio.cliente.id}
              resumo={resumo}
              urlPdf={`/api/relatorio/${relatorio.cliente.id}?secoes=${[...on].join(',')}${mes ? `&mes=${mes}` : ''}`}
            />
          )
        }
      />

      <div className="grid gap-3.5 lg:grid-cols-[300px_1fr]">
        {/* Seletor de cliente */}
        <Painel titulo="Cliente" className="lg:sticky lg:top-6 lg:self-start">
          {lista.length === 0 ? (
            <Vazio>Nenhum cliente cadastrado</Vazio>
          ) : (
            <ul className="max-h-[420px] space-y-0.5 overflow-y-auto">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link
                    href={url({ cliente: c.id })}
                    className={`flex items-center gap-2.5 rounded-ctrl px-2.5 py-2 text-[12.5px] transition-colors ${
                      c.id === escolhido
                        ? 'bg-azul/15 text-pleno shadow-nav-ativo'
                        : 'text-fraco hover:text-corpo'
                    }`}
                  >
                    <Avatar nome={c.nome} tamanho={26} />
                    <span className="truncate">{c.nome}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        {!relatorio ? (
          <Painel>
            <Vazio>Escolha um cliente na coluna ao lado</Vazio>
          </Painel>
        ) : (
          <div className="min-w-0 space-y-3.5">
            <Painel titulo="Seções do relatório" nota="Desligue o que não deve sair no PDF">
              <div className="flex flex-wrap gap-2">
                {SECOES.map((s) => (
                  <ChipLink
                    key={s.chave}
                    href={url({ secoes: alternar(on, s.chave) })}
                    ativo={on.has(s.chave)}
                    scroll={false}
                  >
                    {s.rotulo}
                  </ChipLink>
                ))}
              </div>
            </Painel>

            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              <KpiTile
                rotulo="Receita no mês"
                valor={formatBRLCompacto(relatorio.receita.pagoCentavos)}
                acento="verde"
                serie={relatorio.receita.porMes.map((m) => m.centavos)}
                detalhe={<span>cobranças pagas</span>}
              />
              <KpiTile
                rotulo="Leads"
                valor={String(relatorio.leads.total)}
                acento="ciano"
                detalhe={<span>{relatorio.leads.respondidos} respondidos</span>}
              />
              <KpiTile
                rotulo="Conversas"
                valor={String(relatorio.conversas.total)}
                acento="azul"
                detalhe={<span>{relatorio.conversas.abertas} abertas</span>}
              />
              <KpiTile
                rotulo="Em atraso"
                valor={formatBRLCompacto(relatorio.receita.atrasoCentavos)}
                acento={relatorio.receita.atrasoQtd > 0 ? 'magenta' : 'verde'}
                detalhe={<span>{relatorio.receita.atrasoQtd} cobrança(s)</span>}
              />
            </div>

            <Painel titulo="Saúde da conta">
              <div className="flex flex-wrap items-center gap-6">
                <Anel percentual={relatorio.saude} rotulo="saúde" />
                <ul className="min-w-[220px] flex-1 space-y-2 text-[12.5px]">
                  <Sinal ok={relatorio.receita.atrasoQtd === 0}>
                    Cobranças sem atraso
                  </Sinal>
                  <Sinal ok={relatorio.dominios.foraDoAr === 0}>Sites no ar</Sinal>
                  <Sinal ok={relatorio.dominios.sslVencendo === 0}>
                    Certificados SSL válidos por mais de 30 d
                  </Sinal>
                  <Sinal ok={relatorio.dominios.vencendo60 === 0}>
                    Nenhum domínio vencendo em 60 d
                  </Sinal>
                  <Sinal
                    ok={
                      relatorio.leads.total === 0 ||
                      relatorio.leads.respondidos / relatorio.leads.total >= 0.8
                    }
                  >
                    Ao menos 80% dos leads respondidos
                  </Sinal>
                </ul>
              </div>
            </Painel>

            {on.has('receita') && (
              <Painel titulo="Receita e cobranças" nota="Últimos 6 meses, pela data de pagamento">
                {relatorio.receita.porMes.every((m) => m.centavos === 0) ? (
                  <Vazio>Nenhuma cobrança paga no período</Vazio>
                ) : (
                  <div>
                    {relatorio.receita.porMes.map((m) => (
                      <BarRow
                        key={m.rotulo}
                        rotulo={m.rotulo}
                        valor={m.centavos}
                        maximo={Math.max(
                          ...relatorio.receita.porMes.map((x) => x.centavos),
                          1,
                        )}
                        cor="var(--color-verde)"
                        valorFormatado={formatBRLCompacto(m.centavos)}
                      />
                    ))}
                  </div>
                )}
              </Painel>
            )}

            {on.has('leads') && (
              <Painel titulo="Leads por landing">
                {relatorio.leads.porLanding.length === 0 ? (
                  <Vazio>Nenhum lead no mês</Vazio>
                ) : (
                  <Tabela cabecalho={['Landing', { rotulo: 'Leads', numerica: true }]}>
                    {relatorio.leads.porLanding.map((l) => (
                      <Linha key={l.landing}>
                        <Celula mono>{l.landing}</Celula>
                        <Celula numerica>{l.qtd}</Celula>
                      </Linha>
                    ))}
                  </Tabela>
                )}
              </Painel>
            )}

            {on.has('conversas') && (
              <Painel titulo="Conversas por canal">
                {relatorio.conversas.porCanal.length === 0 ? (
                  <Vazio>Nenhuma conversa aberta no mês</Vazio>
                ) : (
                  <Tabela cabecalho={['Canal', { rotulo: 'Conversas', numerica: true }]}>
                    {relatorio.conversas.porCanal.map((c) => (
                      <Linha key={c.canal}>
                        <Celula>{ROTULO_CANAL[c.canal] ?? c.canal}</Celula>
                        <Celula numerica>{c.qtd}</Celula>
                      </Linha>
                    ))}
                  </Tabela>
                )}
              </Painel>
            )}

            {on.has('dominios') && (
              <Painel titulo="Domínios e sites">
                {relatorio.dominios.lista.length === 0 ? (
                  <Vazio>Nenhum domínio ligado a este cliente</Vazio>
                ) : (
                  <Tabela cabecalho={['Domínio', 'Vencimento', 'SSL']}>
                    {relatorio.dominios.lista.map((d) => (
                      <Linha key={d.dominio}>
                        <Celula mono>{d.dominio}</Celula>
                        <Celula mono>
                          {d.expira_em
                            ? new Date(d.expira_em).toLocaleDateString('pt-BR')
                            : '—'}
                        </Celula>
                        <Celula>
                          {d.ssl_expira ? (
                            <StatusBadge
                              tom={
                                new Date(d.ssl_expira).getTime() - Date.now() <
                                30 * 864e5
                                  ? 'ambar'
                                  : 'verde'
                              }
                            >
                              {new Date(d.ssl_expira).toLocaleDateString('pt-BR')}
                            </StatusBadge>
                          ) : (
                            '—'
                          )}
                        </Celula>
                      </Linha>
                    ))}
                  </Tabela>
                )}
              </Painel>
            )}

            {on.has('contratos') && (
              <Painel
                titulo="Contratos"
                nota={`${relatorio.contratos.ativos} ativo(s) · MRR ${formatBRL(relatorio.contratos.mrrCentavos)}`}
              >
                {relatorio.contratos.lista.length === 0 ? (
                  <Vazio>Nenhum contrato para este cliente</Vazio>
                ) : (
                  <Tabela
                    cabecalho={[
                      'Código',
                      'Frente',
                      'Situação',
                      { rotulo: 'Valor', numerica: true },
                    ]}
                  >
                    {relatorio.contratos.lista.map((c) => (
                      <Linha key={c.codigo}>
                        <Celula mono>{c.codigo}</Celula>
                        <Celula>
                          <span
                            className="inline-flex items-center gap-1.5"
                            style={{ color: CORES_FRENTE[c.frente] }}
                          >
                            {ROTULO_FRENTE[c.frente]}
                          </span>
                        </Celula>
                        <Celula>{c.status}</Celula>
                        <Celula numerica>{formatBRL(c.valor_centavos)}</Celula>
                      </Linha>
                    ))}
                  </Tabela>
                )}
              </Painel>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Sinal({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={ok ? 'text-verde' : 'text-ambar'}
        style={{ textShadow: '0 0 12px currentColor' }}
      >
        {ok ? '✓' : '!'}
      </span>
      <span className={ok ? 'text-suave' : 'text-ambar'}>{children}</span>
    </li>
  )
}
