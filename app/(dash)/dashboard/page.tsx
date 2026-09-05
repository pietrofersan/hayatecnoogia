import { Anel } from '@/components/Anel'
import { BarRow, ColunasMensais } from '@/components/BarRow'
import { BotaoLink } from '@/components/Campo'
import { CabecalhoTela } from '@/components/CabecalhoTela'
import { CORES_FRENTE, FrenteTag } from '@/components/FrenteTag'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { Ponto, StatusBadge, type TomBadge } from '@/components/StatusBadge'
import { CORES_STATUS_COBRANCA, StatusChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { pulsoDashboard, resumoDashboard } from '@/lib/consultas'
import { ROTULO_FRENTE } from '@/lib/db'
import { formatBRL, formatBRLCompacto, formatData } from '@/lib/money'

export const dynamic = 'force-dynamic'

const TOM_LOG: Record<'ok' | 'aguardando' | 'falhou', TomBadge> = {
  ok: 'verde',
  aguardando: 'ambar',
  falhou: 'magenta',
}

const ROTULO_LOG: Record<'ok' | 'aguardando' | 'falhou', string> = {
  ok: 'processado',
  aguardando: 'na fila',
  falhou: 'falhou',
}

const TOM_MODULO: Record<string, TomBadge> = {
  Cobranças: 'verde',
  Contratos: 'roxo',
  Domínios: 'ciano',
  Leads: 'azul',
}

export default async function Dashboard() {
  const [r, p] = await Promise.all([resumoDashboard(), pulsoDashboard()])

  const maxFrente = Math.max(...r.receitaPorFrente.map((f) => f.centavos), 1)
  const maxStatus = Math.max(...r.cobrancasPorStatus.map((s) => s.qtd), 1)

  const serieReceita = r.receita6Meses.map((m) => m.centavos)
  const mesAtual = serieReceita.at(-1) ?? 0
  const mesAnterior = serieReceita.at(-2) ?? 0
  const variacao =
    mesAnterior > 0 ? ((mesAtual - mesAnterior) / mesAnterior) * 100 : null

  const precisaAtencao =
    r.inadimplenciaQtd + p.dominiosSemAuto + p.logs.filter((l) => l.estado === 'falhou').length

  return (
    <div className="space-y-3.5">
      <CabecalhoTela
        titulo="O que precisa de atenção hoje"
        meta={`${p.clientesAtivos} cliente(s) ativo(s) · ${precisaAtencao} item(ns) exigindo ação`}
        acoes={
          <>
            <BotaoLink href="/alertas" variante="secundario">
              Central de alertas
            </BotaoLink>
            <BotaoLink href="/clientes/onboarding" variante="primario">
              + Novo cliente
            </BotaoLink>
          </>
        }
      />

      {/* 4 KPIs, repeat(4,1fr) no desktop */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Receita recorrente"
          valor={formatBRLCompacto(r.mrrCentavos)}
          acento="azul"
          serie={serieReceita}
          tendencia={
            variacao !== null ? { valor: variacao, rotulo: 'vs. mês anterior' } : undefined
          }
          detalhe={
            variacao === null ? <span>{r.contratosAtivos} contrato(s) ativo(s)</span> : undefined
          }
        />
        <KpiTile
          rotulo="A receber no mês"
          valor={formatBRLCompacto(r.aReceberCentavos)}
          acento="roxo"
          detalhe={
            <span>
              {p.contratos30d.qtd} contrato(s) novo(s) ·{' '}
              {formatBRLCompacto(p.contratos30d.centavos)}
            </span>
          }
        />
        <KpiTile
          rotulo="Cobranças em atraso"
          valor={formatBRLCompacto(r.inadimplenciaCentavos)}
          acento={r.inadimplenciaQtd > 0 ? 'magenta' : 'verde'}
          detalhe={<span>{r.inadimplenciaQtd} cobrança(s) vencida(s)</span>}
        />
        <KpiTile
          rotulo="Domínios · 60 d"
          valor={String(p.dominios60d)}
          acento="ciano"
          detalhe={<span>{p.dominiosSemAuto} vence(m) em até 7 dias</span>}
        />
      </div>

      {/* 1.4fr / 1fr: logs à esquerda, saúde + agenda à direita */}
      <div className="grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <Painel
          titulo="Logs do sistema · 24 h"
          nota="Webhooks de Asaas, ZapSign e formulários das landings"
          acao={
            <BotaoLink href="/integracoes" variante="texto">
              Integrações →
            </BotaoLink>
          }
        >
          {p.logs.length === 0 ? (
            <Vazio descricao="Nenhum webhook chegou nas últimas 24 horas.">
              Silêncio nas integrações
            </Vazio>
          ) : (
            <ul className="divide-y divide-azul/[0.07]">
              {p.logs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <Ponto
                    tom={TOM_LOG[l.estado]}
                    pulsa={l.estado === 'aguardando'}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-pleno">
                    {l.titulo}
                  </span>
                  <span className="font-mono text-[10.5px] text-tenue">{l.meta}</span>
                  <StatusBadge tom={TOM_LOG[l.estado]}>{ROTULO_LOG[l.estado]}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <div className="space-y-3.5">
          <Painel titulo="Saúde da operação">
            <div className="flex flex-wrap items-center gap-5">
              <Anel percentual={p.saude} rotulo="saúde" />
              <ul className="min-w-[180px] flex-1 space-y-1.5 text-[11.5px]">
                {p.sinais.map((s) => (
                  <li key={s.rotulo} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={s.ok ? 'text-verde' : 'text-ambar'}
                      style={{ textShadow: '0 0 12px currentColor' }}
                    >
                      {s.ok ? '✓' : '!'}
                    </span>
                    <span className={s.ok ? 'text-tenue' : 'text-ambar'}>{s.rotulo}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Painel>

          <Painel titulo="Agenda de hoje">
            {p.agenda.length === 0 ? (
              <Vazio icone="✓">Nada vence hoje</Vazio>
            ) : (
              <ul className="divide-y divide-azul/[0.07]">
                {p.agenda.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 py-2.5">
                    <span className="w-14 shrink-0 font-mono text-[10.5px] text-fantasma">
                      {a.quando}
                    </span>
                    <StatusBadge tom={TOM_MODULO[a.modulo] ?? 'neutro'}>
                      {a.modulo}
                    </StatusBadge>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-corpo">
                      {a.titulo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <Painel titulo="Receita por frente · 6 meses">
          {r.receitaPorFrente.length === 0 ? (
            <Vazio>Nenhuma cobrança paga no período</Vazio>
          ) : (
            <div>
              {r.receitaPorFrente.map((f) => (
                <BarRow
                  key={f.frente}
                  rotulo={ROTULO_FRENTE[f.frente]}
                  valor={f.centavos}
                  maximo={maxFrente}
                  cor={CORES_FRENTE[f.frente]}
                  valorFormatado={formatBRLCompacto(f.centavos)}
                  dica={`${ROTULO_FRENTE[f.frente]}: ${formatBRL(f.centavos)}`}
                />
              ))}
            </div>
          )}
        </Painel>

        <Painel titulo="Receita realizada" className="lg:col-span-2">
          <ColunasMensais
            dados={r.receita6Meses.map((m) => ({ rotulo: m.rotulo, valor: m.centavos }))}
            formatar={formatBRL}
          />
        </Painel>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-3">
        <Painel titulo="Cobranças por status · 3 meses">
          <div>
            {r.cobrancasPorStatus.map((s) => (
              <BarRow
                key={s.status}
                rotulo={s.status[0].toUpperCase() + s.status.slice(1)}
                valor={s.qtd}
                maximo={maxStatus}
                cor={CORES_STATUS_COBRANCA[s.status]}
                valorFormatado={String(s.qtd)}
              />
            ))}
          </div>
        </Painel>

        <Painel
          titulo="Últimas cobranças"
          className="lg:col-span-2"
          acao={
            <BotaoLink href="/cobrancas" variante="texto">
              Ver todas →
            </BotaoLink>
          }
        >
          {r.ultimasCobrancas.length === 0 ? (
            <Vazio>Sem cobranças registradas</Vazio>
          ) : (
            <Tabela
              cabecalho={[
                'Cliente',
                'Contrato',
                'Vencimento',
                'Situação',
                { rotulo: 'Valor', numerica: true },
              ]}
            >
              {r.ultimasCobrancas.map((c) => (
                <Linha key={c.id}>
                  <Celula>{c.contratos?.clientes?.nome ?? '—'}</Celula>
                  <Celula mono>{c.contratos?.codigo ?? '—'}</Celula>
                  <Celula mono>{formatData(c.vencimento)}</Celula>
                  <Celula>
                    <StatusChip status={c.status} />
                  </Celula>
                  <Celula numerica>{formatBRL(Number(c.valor_centavos))}</Celula>
                </Linha>
              ))}
            </Tabela>
          )}
        </Painel>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Painel
          titulo="Leads recentes"
          nota={`${r.leads30d} lead(s) nos últimos 30 dias`}
          acao={
            <BotaoLink href="/leads" variante="texto">
              Ver todos →
            </BotaoLink>
          }
        >
          {r.leadsRecentes.length === 0 ? (
            <Vazio descricao="Instale o snippet nos sites pela tela de Config.">
              Nenhum lead ainda
            </Vazio>
          ) : (
            <ul className="divide-y divide-azul/[0.07]">
              {r.leadsRecentes.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <Ponto tom={l.lido ? 'neutro' : 'magenta'} pulsa={!l.lido} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-pleno">
                      {l.nome ?? 'Sem nome'}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-tenue">
                      {l.site ?? '—'} · {formatData(l.criado_em)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        <Painel
          titulo="Monitor de sites"
          acao={
            <BotaoLink href="/dominios" variante="texto">
              Domínios →
            </BotaoLink>
          }
        >
          {r.sites.length === 0 ? (
            <Vazio>Cadastre os domínios dos clientes para acompanhar SSL e uptime</Vazio>
          ) : (
            <ul className="divide-y divide-azul/[0.07]">
              {r.sites.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate font-mono text-[11.5px] text-mono">
                    {s.dominio}
                  </span>
                  {s.checado_em ? (
                    <StatusBadge tom={s.uptime_ok ? 'verde' : 'magenta'} brilho>
                      {s.uptime_ok ? 'no ar' : 'fora do ar'}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tom="neutro">sem checagem</StatusBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-fantasma">
        Frentes:
        <FrenteTag frente="digital" />
        <FrenteTag frente="tecnologia" />
        <FrenteTag frente="visual" />
        <FrenteTag frente="comunicacao" />
      </p>
    </div>
  )
}
