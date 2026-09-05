import type { Frente } from './db'
import { supabaseServidor } from './supabase'

export type SecaoRelatorio =
  | 'receita'
  | 'leads'
  | 'conversas'
  | 'dominios'
  | 'contratos'

export const SECOES: { chave: SecaoRelatorio; rotulo: string }[] = [
  { chave: 'receita', rotulo: 'Receita e cobranças' },
  { chave: 'leads', rotulo: 'Leads' },
  { chave: 'conversas', rotulo: 'Conversas' },
  { chave: 'dominios', rotulo: 'Domínios e sites' },
  { chave: 'contratos', rotulo: 'Contratos' },
]

export type Relatorio = {
  cliente: { id: string; nome: string; telefone: string | null; whatsapp: string | null }
  mes: { inicio: string; fim: string; rotulo: string }
  receita: {
    pagoCentavos: number
    aReceberCentavos: number
    atrasoCentavos: number
    atrasoQtd: number
    porMes: { rotulo: string; centavos: number }[]
  }
  leads: {
    total: number
    lidos: number
    respondidos: number
    porLanding: { landing: string; qtd: number }[]
  }
  conversas: { total: number; abertas: number; porCanal: { canal: string; qtd: number }[] }
  dominios: {
    total: number
    vencendo60: number
    sslVencendo: number
    foraDoAr: number
    lista: { dominio: string; expira_em: string | null; ssl_expira: string | null }[]
  }
  contratos: {
    ativos: number
    mrrCentavos: number
    lista: { codigo: string; frente: Frente; valor_centavos: number; status: string }[]
  }
  /** 0–100, ver `calcularSaude` */
  saude: number
}

function limitesDoMes(mes?: string) {
  const base = mes ? new Date(`${mes}-01T12:00:00`) : new Date()
  const inicio = new Date(base.getFullYear(), base.getMonth(), 1)
  const fim = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
    rotulo: inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  }
}

/**
 * Saúde da conta: média de cinco sinais binários que já existem no banco.
 * Não é um índice proprietário — é a contagem do que está em ordem, para
 * que o número possa ser explicado ao cliente linha a linha.
 */
function calcularSaude(r: Omit<Relatorio, 'saude'>): number {
  const sinais = [
    r.receita.atrasoQtd === 0,
    r.dominios.foraDoAr === 0,
    r.dominios.sslVencendo === 0,
    r.dominios.vencendo60 === 0,
    r.leads.total === 0 || r.leads.respondidos / r.leads.total >= 0.8,
  ]
  return Math.round((sinais.filter(Boolean).length / sinais.length) * 100)
}

export async function montarRelatorio(
  clienteId: string,
  mes?: string,
): Promise<Relatorio | null> {
  const supabase = await supabaseServidor()
  const janela = limitesDoMes(mes)
  const inicioISO = `${janela.inicio}T00:00:00Z`
  const fimISO = `${janela.fim}T23:59:59Z`
  const em60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  const em30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  const seisMeses = new Date()
  seisMeses.setMonth(seisMeses.getMonth() - 5, 1)

  const { data: cliente } = await supabase
    .from('clientes')
    .select('id, nome, telefone, whatsapp')
    .eq('id', clienteId)
    .maybeSingle()

  if (!cliente) return null

  const [
    { data: contratos },
    { data: cobrancas },
    { data: leads },
    { data: sites },
    { data: dominios },
    { data: conversas },
  ] = await Promise.all([
    supabase
      .from('contratos')
      .select('id, codigo, frente, valor_centavos, modo, status')
      .eq('cliente_id', clienteId),
    supabase
      .from('cobrancas')
      .select('valor_centavos, status, vencimento, pago_em, contratos!inner(cliente_id)')
      .eq('contratos.cliente_id', clienteId)
      .gte('vencimento', seisMeses.toISOString().slice(0, 10)),
    supabase
      .from('leads')
      .select('id, site, lido, respondido, criado_em')
      .eq('cliente_id', clienteId)
      .gte('criado_em', inicioISO)
      .lte('criado_em', fimISO),
    supabase
      .from('sites')
      .select('dominio, ssl_expira, dominio_expira, uptime_ok')
      .eq('cliente_id', clienteId),
    supabase
      .from('dominios_radar')
      .select('dominio, expira_em')
      .eq('cliente_id', clienteId)
      .eq('ativo', true),
    supabase
      .from('conversations')
      .select('id, status, created_at, channel_accounts(channel)')
      .gte('created_at', inicioISO)
      .lte('created_at', fimISO),
  ])

  type Cob = {
    valor_centavos: number
    status: string
    vencimento: string
    pago_em: string | null
  }
  type Led = { id: string; site: string | null; lido: boolean; respondido: boolean }
  type Sit = {
    dominio: string
    ssl_expira: string | null
    dominio_expira: string | null
    uptime_ok: boolean | null
  }
  type Dom = { dominio: string; expira_em: string | null }
  type Con = { id: string; status: string; channel_accounts: { channel: string } | null }

  const listaCob = (cobrancas ?? []) as unknown as Cob[]
  const listaLeads = (leads ?? []) as unknown as Led[]
  const listaSites = (sites ?? []) as unknown as Sit[]
  const listaDom = (dominios ?? []) as unknown as Dom[]
  const listaConv = (conversas ?? []) as unknown as Con[]
  const listaContratos = (contratos ?? []) as unknown as {
    id: string
    codigo: string
    frente: Frente
    valor_centavos: number
    modo: string
    status: string
  }[]

  const noMes = (d: string | null) =>
    !!d && d >= janela.inicio && d <= janela.fim

  const meses: { rotulo: string; chave: string; centavos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i, 1)
    meses.push({
      rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      chave: d.toISOString().slice(0, 7),
      centavos: 0,
    })
  }
  for (const c of listaCob) {
    if (c.status !== 'paga' || !c.pago_em) continue
    const mesDoPagamento = meses.find((m) => m.chave === c.pago_em!.slice(0, 7))
    if (mesDoPagamento) mesDoPagamento.centavos += Number(c.valor_centavos)
  }

  const porLanding = new Map<string, number>()
  for (const l of listaLeads) {
    const chave = l.site ?? 'sem landing'
    porLanding.set(chave, (porLanding.get(chave) ?? 0) + 1)
  }

  const porCanal = new Map<string, number>()
  for (const c of listaConv) {
    const canal = c.channel_accounts?.channel ?? 'desconhecido'
    porCanal.set(canal, (porCanal.get(canal) ?? 0) + 1)
  }

  const vencidas = listaCob.filter((c) => c.status === 'vencida')

  const parcial: Omit<Relatorio, 'saude'> = {
    cliente,
    mes: janela,
    receita: {
      pagoCentavos: listaCob
        .filter((c) => c.status === 'paga' && noMes(c.pago_em))
        .reduce((s, c) => s + Number(c.valor_centavos), 0),
      aReceberCentavos: listaCob
        .filter((c) => c.status === 'pendente' && noMes(c.vencimento))
        .reduce((s, c) => s + Number(c.valor_centavos), 0),
      atrasoCentavos: vencidas.reduce((s, c) => s + Number(c.valor_centavos), 0),
      atrasoQtd: vencidas.length,
      porMes: meses.map(({ rotulo, centavos }) => ({ rotulo, centavos })),
    },
    leads: {
      total: listaLeads.length,
      lidos: listaLeads.filter((l) => l.lido).length,
      respondidos: listaLeads.filter((l) => l.respondido).length,
      porLanding: [...porLanding.entries()]
        .map(([landing, qtd]) => ({ landing, qtd }))
        .sort((a, b) => b.qtd - a.qtd),
    },
    conversas: {
      total: listaConv.length,
      abertas: listaConv.filter((c) => c.status === 'open').length,
      porCanal: [...porCanal.entries()]
        .map(([canal, qtd]) => ({ canal, qtd }))
        .sort((a, b) => b.qtd - a.qtd),
    },
    dominios: {
      total: listaDom.length + listaSites.length,
      vencendo60: [
        ...listaDom.map((d) => d.expira_em),
        ...listaSites.map((s) => s.dominio_expira),
      ].filter((d): d is string => !!d && d <= em60).length,
      sslVencendo: listaSites.filter((s) => s.ssl_expira && s.ssl_expira <= em30).length,
      foraDoAr: listaSites.filter((s) => s.uptime_ok === false).length,
      lista: [
        ...listaDom.map((d) => ({
          dominio: d.dominio,
          expira_em: d.expira_em,
          ssl_expira: null,
        })),
        ...listaSites.map((s) => ({
          dominio: s.dominio,
          expira_em: s.dominio_expira,
          ssl_expira: s.ssl_expira,
        })),
      ],
    },
    contratos: {
      ativos: listaContratos.filter((c) => c.status === 'ativo').length,
      mrrCentavos: listaContratos
        .filter((c) => c.status === 'ativo' && c.modo === 'recorrente')
        .reduce((s, c) => s + Number(c.valor_centavos), 0),
      lista: listaContratos.map((c) => ({
        codigo: c.codigo,
        frente: c.frente,
        valor_centavos: Number(c.valor_centavos),
        status: c.status,
      })),
    },
  }

  return { ...parcial, saude: calcularSaude(parcial) }
}
