import { BarRow, ColunasMensais } from '@/components/BarRow'
import { CORES_FRENTE, FrenteTag } from '@/components/FrenteTag'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { CORES_STATUS_COBRANCA, StatusChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { resumoDashboard } from '@/lib/consultas'
import { ROTULO_FRENTE } from '@/lib/db'
import { formatBRL, formatBRLCompacto, formatData } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const r = await resumoDashboard()
  const maxFrente = Math.max(...r.receitaPorFrente.map((f) => f.centavos), 1)
  const maxStatus = Math.max(...r.cobrancasPorStatus.map((s) => s.qtd), 1)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-marfim">Dashboard</h1>
        <p className="text-sm text-apagado">Operação da agência em tempo real.</p>
      </header>

      {/* KPIs grandes */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          rotulo="MRR"
          valor={formatBRLCompacto(r.mrrCentavos)}
          detalhe={<span>recorrência ativa</span>}
        />
        <KpiTile
          rotulo="Contratos ativos"
          valor={String(r.contratosAtivos)}
          detalhe={<span>todas as frentes</span>}
        />
        <KpiTile
          rotulo="A receber no mês"
          valor={formatBRLCompacto(r.aReceberCentavos)}
          detalhe={<span>cobranças pendentes</span>}
        />
        <KpiTile
          rotulo="Inadimplência"
          valor={formatBRLCompacto(r.inadimplenciaCentavos)}
          destaque={r.inadimplenciaCentavos > 0 ? 'critico' : undefined}
          detalhe={<span>{r.inadimplenciaQtd} cobrança(s) vencida(s)</span>}
        />
        <KpiTile
          rotulo="Leads · 30 dias"
          valor={String(r.leads30d)}
          detalhe={<span>de todos os sites</span>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Receita por frente */}
        <Painel titulo="Receita por frente · 6 meses">
          {r.receitaPorFrente.length === 0 ? (
            <Vazio>Nenhuma cobrança paga no período.</Vazio>
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

        {/* Receita 6 meses — série única, sem legenda */}
        <Painel titulo="Receita realizada" className="lg:col-span-2">
          <ColunasMensais
            dados={r.receita6Meses.map((m) => ({ rotulo: m.rotulo, valor: m.centavos }))}
            formatar={formatBRL}
          />
        </Painel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cobranças por status */}
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

        {/* Últimas cobranças */}
        <Painel titulo="Últimas cobranças" className="lg:col-span-2">
          {r.ultimasCobrancas.length === 0 ? (
            <Vazio>Sem cobranças registradas.</Vazio>
          ) : (
            <Tabela cabecalho={['Cliente', 'Contrato', 'Vencimento', 'Status', 'Valor']}>
              {r.ultimasCobrancas.map((c) => (
                <Linha key={c.id}>
                  <Celula>{c.contratos?.clientes?.nome ?? '—'}</Celula>
                  <Celula>
                    <span className="font-mono text-xs text-nevoa">
                      {c.contratos?.codigo ?? '—'}
                    </span>
                  </Celula>
                  <Celula>{formatData(c.vencimento)}</Celula>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leads recentes */}
        <Painel titulo="Leads recentes">
          {r.leadsRecentes.length === 0 ? (
            <Vazio>Nenhum lead ainda. Instale o snippet nos sites (Config).</Vazio>
          ) : (
            <ul className="divide-y divide-linha/60">
              {r.leadsRecentes.map((l) => (
                <li key={l.id} className="flex items-baseline gap-3 py-2.5">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                      l.lido ? 'bg-apagado' : 'bg-dig'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-marfim">{l.nome ?? 'Sem nome'}</p>
                    <p className="truncate text-xs text-apagado">
                      {l.site ?? '—'} · {formatData(l.criado_em)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Painel>

        {/* Monitor de sites — placeholder F1 */}
        <Painel
          titulo="Monitor de sites"
          acao={<span className="text-[10px] tracking-wide text-apagado uppercase">F2</span>}
        >
          {r.sites.length === 0 ? (
            <Vazio>Cadastre os domínios dos clientes para acompanhar SSL e uptime.</Vazio>
          ) : (
            <ul className="divide-y divide-linha/60">
              {r.sites.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <span className="truncate text-sm text-ink-2">{s.dominio}</span>
                  <span className="text-xs text-apagado">
                    {s.checado_em
                      ? s.uptime_ok
                        ? '✓ no ar'
                        : '! fora do ar'
                      : 'checagem automática na F2'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      </div>

      {/* Strip do cockpit — skeleton F1 */}
      <Painel
        titulo="Cockpit dos produtos"
        acao={<span className="text-[10px] tracking-wide text-apagado uppercase">F2</span>}
      >
        <div className="grid gap-3 sm:grid-cols-4">
          {['Sites', 'Tráfego', 'Sistemas', 'Sinalização'].map((nome) => (
            <div
              key={nome}
              className="rounded-lg border border-dashed border-linha px-4 py-6 text-center"
            >
              <p className="text-xs text-nevoa">{nome}</p>
              <div className="mx-auto mt-3 h-2 w-2/3 rounded-full bg-linha" />
            </div>
          ))}
        </div>
      </Painel>

      <p className="flex flex-wrap items-center gap-2 text-[11px] text-apagado">
        Frentes:
        <FrenteTag frente="digital" />
        <FrenteTag frente="tecnologia" />
        <FrenteTag frente="visual" />
        <FrenteTag frente="comunicacao" />
      </p>
    </div>
  )
}
