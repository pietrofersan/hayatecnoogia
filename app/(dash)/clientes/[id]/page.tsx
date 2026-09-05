import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Abas } from '@/components/Abas'
import { Avatar } from '@/components/Avatar'
import { BotaoLink } from '@/components/Campo'
import { EspelharAsaas } from '@/components/EspelharAsaas'
import { FormCliente } from '@/components/FormCliente'
import { FrenteTag } from '@/components/FrenteTag'
import { KpiTile } from '@/components/KpiTile'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge } from '@/components/StatusBadge'
import { StatusChip, StatusContratoChip } from '@/components/StatusChip'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import type {
  ChecagemDominio,
  Cliente,
  Cobranca,
  Contrato,
  Lead,
  PalavraChave,
  Segmento,
  Site,
} from '@/lib/db'
import { ROTULO_MODO, ROTULO_TIPO } from '@/lib/db'
import { formatBRL, formatData } from '@/lib/money'
import { supabaseServidor } from '@/lib/supabase'
import { formataDocumento } from '@/lib/validacao'

export const dynamic = 'force-dynamic'

const ABAS = [
  { chave: 'visao', rotulo: 'Visão geral' },
  { chave: 'mercado', rotulo: 'Mercado' },
  { chave: 'financeiro', rotulo: 'Financeiro' },
  { chave: 'leads', rotulo: 'Leads' },
  { chave: 'presenca', rotulo: 'Presença digital' },
] as const

type ChaveAba = (typeof ABAS)[number]['chave']

/** Ficha 360: contratos, cobranças, leads, sites e segmentos do cliente. */
export default async function FichaCliente({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const { aba } = await searchParams
  const supabase = await supabaseServidor()

  const [
    { data: cliente },
    { data: contratos },
    { data: cobrancas },
    { data: leads },
    { data: sites },
    { data: segmentos },
  ] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase
      .from('contratos')
      .select('*')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('cobrancas')
      .select('*, contratos!inner(codigo, cliente_id)')
      .eq('contratos.cliente_id', id)
      .order('vencimento', { ascending: false })
      .limit(24),
    supabase
      .from('leads')
      .select('*')
      .eq('cliente_id', id)
      .order('criado_em', { ascending: false })
      .limit(12),
    supabase.from('sites').select('*').eq('cliente_id', id),
    supabase
      .from('segmentos')
      .select('*, palavras_chave(tendencia, interessante, checagens_dominio(disponivel))')
      .eq('cliente_id', id),
  ])

  if (!cliente) notFound()
  const c = cliente as Cliente

  const listaContratos = (contratos ?? []) as Contrato[]
  const listaCobrancas = (cobrancas ?? []) as unknown as (Cobranca & {
    contratos: { codigo: string }
  })[]
  const listaLeads = (leads ?? []) as Lead[]
  const listaSites = (sites ?? []) as Site[]
  const listaSegmentos = (segmentos ?? []) as unknown as (Segmento & {
    palavras_chave: (Pick<PalavraChave, 'tendencia' | 'interessante'> & {
      checagens_dominio: Pick<ChecagemDominio, 'disponivel'>[]
    })[]
  })[]

  const ativos = listaContratos.filter((ct) => ct.status === 'ativo')
  const mrr = ativos
    .filter((ct) => ct.modo === 'recorrente')
    .reduce((s, ct) => s + Number(ct.valor_centavos), 0)
  const vencidas = listaCobrancas.filter((cb) => cb.status === 'vencida')
  const atraso = vencidas.reduce((s, cb) => s + Number(cb.valor_centavos), 0)
  const palavras = listaSegmentos.flatMap((s) => s.palavras_chave)
  const emAlta = palavras.filter((p) => p.tendencia === 'subindo').length

  const ativa: ChaveAba = (ABAS.find((a) => a.chave === aba)?.chave ?? 'visao') as ChaveAba
  const base = `/clientes/${c.id}`

  return (
    <div className="space-y-3.5">
      <Link href="/clientes" className="inline-block text-[11.5px] text-tenue hover:text-corpo">
        ← Carteira de clientes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <Avatar nome={c.nome_fantasia ?? c.nome} tamanho={52} />
          <div className="min-w-0">
            <h1 className="text-[21px] leading-tight font-semibold text-pleno">{c.nome}</h1>
            <p className="mt-1.5 font-mono text-[10.5px] text-tenue">
              {formataDocumento(c.documento) || 'sem documento'} ·{' '}
              {c.email ?? 'sem e-mail'} · {c.whatsapp ?? c.telefone ?? 'sem telefone'} ·
              cliente desde {formatData(c.criado_em)}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StatusBadge tom={ativos.length > 0 ? 'verde' : 'neutro'}>
                {ativos.length > 0 ? `${ativos.length} contrato(s) ativo(s)` : 'sem contrato ativo'}
              </StatusBadge>
              <StatusBadge tom={vencidas.length > 0 ? 'magenta' : 'verde'} brilho>
                {vencidas.length > 0 ? `${vencidas.length} em atraso` : 'em dia'}
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {c.asaas_customer_id ? (
            <StatusBadge tom="verde">espelhado no Asaas</StatusBadge>
          ) : (
            <EspelharAsaas clienteId={c.id} />
          )}
          <FormCliente cliente={c} />
          <BotaoLink href={`/relatorio?cliente=${c.id}`} variante="roxo">
            Relatório
          </BotaoLink>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          rotulo="Receita recorrente"
          valor={formatBRL(mrr)}
          acento="azul"
          detalhe={<span>{listaContratos.length} contrato(s) no total</span>}
        />
        <KpiTile
          rotulo="Em atraso"
          valor={formatBRL(atraso)}
          acento={atraso > 0 ? 'magenta' : 'verde'}
          detalhe={<span>{vencidas.length} cobrança(s)</span>}
        />
        <KpiTile
          rotulo="Leads"
          valor={String(listaLeads.length)}
          acento="ciano"
          detalhe={<span>{listaLeads.filter((l) => !l.lido).length} não lido(s)</span>}
        />
        <KpiTile
          rotulo="Palavras em alta"
          valor={String(emAlta)}
          acento="verde"
          detalhe={<span>de {palavras.length} medidas</span>}
        />
      </div>

      <Abas
        ativa={ativa}
        abas={ABAS.map((a) => ({
          ...a,
          href: a.chave === 'visao' ? base : `${base}?aba=${a.chave}`,
        }))}
      />

      {ativa === 'visao' && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Painel titulo="Cadastro">
            <dl className="space-y-0">
              <Item rotulo="Razão social" valor={c.nome} />
              <Item rotulo="Nome fantasia" valor={c.nome_fantasia} />
              <Item rotulo="Documento" valor={formataDocumento(c.documento)} />
              <Item rotulo="E-mail" valor={c.email} />
              <Item rotulo="Telefone" valor={c.telefone} />
              <Item rotulo="WhatsApp" valor={c.whatsapp} />
              <Item rotulo="Asaas" valor={c.asaas_customer_id} />
            </dl>
          </Painel>

          <Painel titulo="Observações">
            {c.observacoes ? (
              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-corpo">
                {c.observacoes}
              </p>
            ) : (
              <Vazio>Nada anotado sobre este cliente</Vazio>
            )}
          </Painel>
        </div>
      )}

      {ativa === 'mercado' && (
        <Painel titulo="Segmentos ligados a este cliente">
          {listaSegmentos.length === 0 ? (
            <Vazio acao={<BotaoLink href="/segmentos">Ver segmentos</BotaoLink>}>
              Nenhum segmento ligado
            </Vazio>
          ) : (
            <Tabela
              cabecalho={[
                'Segmento',
                { rotulo: 'Palavras', numerica: true },
                { rotulo: 'Em alta', numerica: true },
                { rotulo: 'Domínio livre', numerica: true },
                { rotulo: 'Ação', numerica: true },
              ]}
            >
              {listaSegmentos.map((s) => (
                <Linha key={s.id}>
                  <Celula>
                    <Link href={`/segmentos/${s.id}`} className="text-pleno hover:text-ciano">
                      {s.nome}
                    </Link>
                  </Celula>
                  <Celula numerica mono>
                    {s.palavras_chave.length}
                  </Celula>
                  <Celula numerica mono>
                    {s.palavras_chave.filter((p) => p.tendencia === 'subindo').length}
                  </Celula>
                  <Celula numerica mono>
                    {
                      s.palavras_chave.filter((p) =>
                        p.checagens_dominio.some((d) => d.disponivel === true),
                      ).length
                    }
                  </Celula>
                  <Celula numerica>
                    <BotaoLink href={`/segmentos/${s.id}`}>Abrir</BotaoLink>
                  </Celula>
                </Linha>
              ))}
            </Tabela>
          )}
        </Painel>
      )}

      {ativa === 'financeiro' && (
        <div className="space-y-3.5">
          <Painel titulo="Contratos">
            {listaContratos.length === 0 ? (
              <Vazio>Sem contratos</Vazio>
            ) : (
              <Tabela
                cabecalho={[
                  'Código',
                  'Frente',
                  'Tipo',
                  'Assinatura',
                  { rotulo: 'Valor', numerica: true },
                ]}
              >
                {listaContratos.map((ct) => (
                  <Linha key={ct.id}>
                    <Celula>
                      <Link
                        href={`/contratos?c=${ct.id}`}
                        className="font-mono text-[11.5px] text-ciano hover:underline"
                      >
                        {ct.codigo}
                      </Link>
                    </Celula>
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
                      <StatusContratoChip status={ct.status} />
                    </Celula>
                    <Celula numerica>{formatBRL(Number(ct.valor_centavos))}</Celula>
                  </Linha>
                ))}
              </Tabela>
            )}
          </Painel>

          <Painel titulo="Cobranças">
            {listaCobrancas.length === 0 ? (
              <Vazio>Sem cobranças</Vazio>
            ) : (
              <Tabela
                cabecalho={[
                  'Vencimento',
                  'Contrato',
                  'Forma',
                  'Situação',
                  { rotulo: 'Valor', numerica: true },
                  '',
                ]}
                minima="48rem"
              >
                {listaCobrancas.map((cb) => (
                  <Linha key={cb.id}>
                    <Celula mono>{formatData(cb.vencimento)}</Celula>
                    <Celula mono>{cb.contratos?.codigo}</Celula>
                    <Celula mono>{cb.forma ?? '—'}</Celula>
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
                          className="font-mono text-[11px] text-ciano hover:underline"
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
        </div>
      )}

      {ativa === 'leads' && (
        <Painel titulo="Leads deste cliente">
          {listaLeads.length === 0 ? (
            <Vazio acao={<BotaoLink href="/leads">Ver todos os leads</BotaoLink>}>
              Sem leads deste cliente
            </Vazio>
          ) : (
            <ul className="divide-y divide-azul/[0.07]">
              {listaLeads.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-pleno">
                      {l.nome ?? 'Sem nome'}
                    </p>
                    <p className="truncate font-mono text-[10.5px] text-tenue">
                      {l.email ?? l.telefone ?? '—'} · {l.site ?? 'sem landing'} ·{' '}
                      {formatData(l.criado_em)}
                    </p>
                  </div>
                  <StatusBadge tom={l.respondido ? 'verde' : l.lido ? 'azul' : 'magenta'}>
                    {l.respondido ? 'respondido' : l.lido ? 'lido' : 'novo'}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Painel>
      )}

      {ativa === 'presenca' && (
        <Painel titulo="Sites e domínios">
          {listaSites.length === 0 ? (
            <Vazio acao={<BotaoLink href="/config">Cadastrar site</BotaoLink>}>
              Nenhum domínio cadastrado
            </Vazio>
          ) : (
            <Tabela cabecalho={['Domínio', 'Host', 'SSL expira', 'Uptime']}>
              {listaSites.map((s) => (
                <Linha key={s.id}>
                  <Celula mono>{s.dominio}</Celula>
                  <Celula mono>{s.host ?? '—'}</Celula>
                  <Celula mono>{s.ssl_expira ? formatData(s.ssl_expira) : '—'}</Celula>
                  <Celula>
                    <StatusBadge
                      tom={
                        s.uptime_ok === false ? 'magenta' : s.uptime_ok ? 'verde' : 'neutro'
                      }
                    >
                      {s.uptime_ok === false
                        ? 'fora do ar'
                        : s.uptime_ok
                          ? 'no ar'
                          : 'sem checagem'}
                    </StatusBadge>
                  </Celula>
                </Linha>
              ))}
            </Tabela>
          )}
        </Painel>
      )}
    </div>
  )
}

function Item({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-azul/[0.07] py-2 last:border-0">
      <dt className="font-mono text-[9.5px] tracking-[0.2em] text-fantasma uppercase">
        {rotulo}
      </dt>
      <dd className="truncate font-mono text-[11.5px] text-mono">
        {valor || <span className="text-abissal">—</span>}
      </dd>
    </div>
  )
}
