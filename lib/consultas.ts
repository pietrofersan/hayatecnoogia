import { supabaseServidor } from './supabase'
import type {
  Cobranca,
  Contrato,
  Frente,
  Lead,
  Site,
  StatusCobranca,
} from './db'

/** Início do mês corrente / do mês N meses atrás, em YYYY-MM-DD. */
function primeiroDiaDoMes(deslocamento = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + deslocamento, 1)
    .toISOString()
    .slice(0, 10)
}

function ultimoDiaDoMes(deslocamento = 0): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + deslocamento + 1, 0)
    .toISOString()
    .slice(0, 10)
}

export type ResumoDashboard = {
  mrrCentavos: number
  contratosAtivos: number
  aReceberCentavos: number
  inadimplenciaCentavos: number
  inadimplenciaQtd: number
  leads30d: number
  receitaPorFrente: { frente: Frente; centavos: number }[]
  receita6Meses: { rotulo: string; centavos: number }[]
  cobrancasPorStatus: { status: StatusCobranca; qtd: number }[]
  ultimasCobrancas: (Cobranca & {
    contratos: { codigo: string; clientes: { nome: string } | null } | null
  })[]
  leadsRecentes: Lead[]
  sites: Site[]
}

export async function resumoDashboard(): Promise<ResumoDashboard> {
  const supabase = await supabaseServidor()
  const inicioJanela = primeiroDiaDoMes(-5)
  const trintaDias = new Date(Date.now() - 30 * 864e5).toISOString()

  const [
    { data: ativos },
    { data: cobrancasJanela },
    { data: aReceber },
    { data: vencidas },
    { count: leads30d },
    { data: ultimasCobrancas },
    { data: leadsRecentes },
    { data: sites },
  ] = await Promise.all([
    supabase
      .from('contratos')
      .select('id, frente, modo, valor_centavos, parcelas, status')
      .eq('status', 'ativo'),
    supabase
      .from('cobrancas')
      .select('valor_centavos, pago_em, status, contrato_id, contratos(frente)')
      .eq('status', 'paga')
      .gte('vencimento', inicioJanela),
    supabase
      .from('cobrancas')
      .select('valor_centavos')
      .eq('status', 'pendente')
      .gte('vencimento', primeiroDiaDoMes())
      .lte('vencimento', ultimoDiaDoMes()),
    supabase.from('cobrancas').select('valor_centavos').eq('status', 'vencida'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('criado_em', trintaDias),
    supabase
      .from('cobrancas')
      .select('*, contratos(codigo, clientes(nome))')
      .order('vencimento', { ascending: false })
      .limit(8),
    supabase.from('leads').select('*').order('criado_em', { ascending: false }).limit(6),
    supabase.from('sites').select('*').order('dominio').limit(8),
  ])

  const contratosAtivos = (ativos ?? []) as Pick<
    Contrato,
    'id' | 'frente' | 'modo' | 'valor_centavos' | 'parcelas' | 'status'
  >[]

  // MRR = soma das mensalidades recorrentes ativas.
  const mrrCentavos = contratosAtivos
    .filter((c) => c.modo === 'recorrente')
    .reduce((soma, c) => soma + Number(c.valor_centavos), 0)

  // Receita por frente: o que efetivamente entrou nos últimos 6 meses.
  const porFrente = new Map<Frente, number>()
  for (const linha of (cobrancasJanela ?? []) as unknown as {
    valor_centavos: number
    pago_em: string | null
    contratos: { frente: Frente } | null
  }[]) {
    const frente = linha.contratos?.frente
    if (!frente) continue
    porFrente.set(frente, (porFrente.get(frente) ?? 0) + Number(linha.valor_centavos))
  }

  // Receita mês a mês (6 meses), pela data de pagamento.
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
  for (const linha of (cobrancasJanela ?? []) as unknown as {
    valor_centavos: number
    pago_em: string | null
  }[]) {
    if (!linha.pago_em) continue
    const chave = linha.pago_em.slice(0, 7)
    const mes = meses.find((m) => m.chave === chave)
    if (mes) mes.centavos += Number(linha.valor_centavos)
  }

  const { data: contagemStatus } = await supabase
    .from('cobrancas')
    .select('status')
    .gte('vencimento', primeiroDiaDoMes(-2))

  const contagem = new Map<StatusCobranca, number>()
  for (const { status } of (contagemStatus ?? []) as { status: StatusCobranca }[]) {
    contagem.set(status, (contagem.get(status) ?? 0) + 1)
  }

  const somar = (linhas: { valor_centavos: number }[] | null) =>
    (linhas ?? []).reduce((s, l) => s + Number(l.valor_centavos), 0)

  return {
    mrrCentavos,
    contratosAtivos: contratosAtivos.length,
    aReceberCentavos: somar(aReceber),
    inadimplenciaCentavos: somar(vencidas),
    inadimplenciaQtd: (vencidas ?? []).length,
    leads30d: leads30d ?? 0,
    receitaPorFrente: (['digital', 'tecnologia', 'visual', 'comunicacao'] as Frente[])
      .map((frente) => ({ frente, centavos: porFrente.get(frente) ?? 0 }))
      .filter((f) => f.centavos > 0 || porFrente.size === 0),
    receita6Meses: meses.map(({ rotulo, centavos }) => ({ rotulo, centavos })),
    cobrancasPorStatus: (
      ['paga', 'pendente', 'vencida', 'estornada', 'cancelada'] as StatusCobranca[]
    ).map((status) => ({ status, qtd: contagem.get(status) ?? 0 })),
    ultimasCobrancas: (ultimasCobrancas ?? []) as ResumoDashboard['ultimasCobrancas'],
    leadsRecentes: (leadsRecentes ?? []) as Lead[],
    sites: (sites ?? []) as Site[],
  }
}

// Pulso do dashboard (README §1) -------------------------------------

export type LinhaLog = {
  id: string
  titulo: string
  meta: string
  estado: 'ok' | 'aguardando' | 'falhou'
}

export type ItemAgenda = {
  id: string
  quando: string
  modulo: 'Cobranças' | 'Contratos' | 'Domínios' | 'Leads'
  titulo: string
}

export type PulsoDashboard = {
  clientesAtivos: number
  dominios60d: number
  dominiosSemAuto: number
  contratos30d: { qtd: number; centavos: number }
  logs: LinhaLog[]
  agenda: ItemAgenda[]
  /** 0–100: quantos dos cinco sinais de operação estão em ordem */
  saude: number
  sinais: { rotulo: string; ok: boolean }[]
}

function haQuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 6e4)
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  return `há ${Math.round(min / 60)} h`
}

/**
 * O que o dashboard mostra além dos números de receita: o que rodou nas
 * últimas 24 h, o que vence hoje e um índice de saúde que é só a contagem
 * dos sinais em ordem — nada de índice proprietário.
 */
export async function pulsoDashboard(): Promise<PulsoDashboard> {
  const supabase = await supabaseServidor()
  const hoje = new Date().toISOString().slice(0, 10)
  const em7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  const em60 = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10)
  const ha24h = new Date(Date.now() - 864e5).toISOString()
  const ha30d = new Date(Date.now() - 30 * 864e5).toISOString()

  const [
    { data: clientes },
    { data: dominios },
    { data: novos },
    { data: hooks },
    { data: venceHoje },
    { data: contratosHoje },
    { data: sites },
    { data: leadsParados },
  ] = await Promise.all([
    supabase.from('contratos').select('cliente_id').eq('status', 'ativo'),
    supabase
      .from('dominios_radar')
      .select('id, dominio, expira_em, clientes(nome)')
      .eq('ativo', true)
      .not('expira_em', 'is', null)
      .lte('expira_em', em60)
      .order('expira_em'),
    supabase
      .from('contratos')
      .select('valor_centavos')
      .eq('status', 'ativo')
      .gte('criado_em', ha30d),
    supabase
      .from('webhook_logs')
      .select('id, origem, evento, erro, processado, recebido_em')
      .gte('recebido_em', ha24h)
      .order('recebido_em', { ascending: false })
      .limit(5),
    supabase
      .from('cobrancas')
      .select('id, valor_centavos, vencimento, contratos(codigo, clientes(nome))')
      .eq('status', 'pendente')
      .eq('vencimento', hoje),
    supabase
      .from('contratos')
      .select('id, codigo, fim, clientes(nome)')
      .eq('status', 'ativo')
      .eq('fim', hoje),
    supabase.from('sites').select('id, uptime_ok, ssl_expira'),
    supabase
      .from('leads')
      .select('id, nome, site, criado_em')
      .eq('lido', false)
      .lte('criado_em', new Date(Date.now() - 36e5).toISOString())
      .order('criado_em')
      .limit(4),
  ])

  type Dom = { id: string; dominio: string; expira_em: string | null; clientes: { nome: string } | null }
  type Cob = { id: string; vencimento: string; contratos: { codigo: string; clientes: { nome: string } | null } | null }
  type Con = { id: string; codigo: string; fim: string | null; clientes: { nome: string } | null }
  type Led = { id: string; nome: string | null; site: string | null; criado_em: string }
  type Hook = { id: number; origem: string; evento: string | null; erro: string | null; processado: boolean; recebido_em: string }
  type Sit = { id: string; uptime_ok: boolean | null; ssl_expira: string | null }

  const listaDom = (dominios ?? []) as unknown as Dom[]
  const listaSites = (sites ?? []) as Sit[]

  const logs: LinhaLog[] = ((hooks ?? []) as Hook[]).map((h) => ({
    id: String(h.id),
    titulo: `${h.origem} · ${h.evento ?? 'evento sem nome'}`,
    meta: haQuanto(h.recebido_em),
    estado: h.erro ? 'falhou' : h.processado ? 'ok' : 'aguardando',
  }))

  const agenda: ItemAgenda[] = [
    ...((venceHoje ?? []) as unknown as Cob[]).map((c) => ({
      id: `cob-${c.id}`,
      quando: 'hoje',
      modulo: 'Cobranças' as const,
      titulo: `${c.contratos?.clientes?.nome ?? 'Cliente'} · ${c.contratos?.codigo ?? '—'}`,
    })),
    ...((contratosHoje ?? []) as unknown as Con[]).map((c) => ({
      id: `con-${c.id}`,
      quando: 'hoje',
      modulo: 'Contratos' as const,
      titulo: `${c.codigo} encerra · ${c.clientes?.nome ?? 'sem cliente'}`,
    })),
    ...listaDom
      .filter((d) => d.expira_em && d.expira_em <= em7)
      .slice(0, 3)
      .map((d) => ({
        id: `dom-${d.id}`,
        quando: new Date(d.expira_em!).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        modulo: 'Domínios' as const,
        titulo: `${d.dominio} vence`,
      })),
    ...((leadsParados ?? []) as Led[]).map((l) => ({
      id: `lead-${l.id}`,
      quando: haQuanto(l.criado_em),
      modulo: 'Leads' as const,
      titulo: `${l.nome ?? 'Lead sem nome'} sem contato`,
    })),
  ].slice(0, 6)

  const vencidasCount = await supabase
    .from('cobrancas')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'vencida')

  const sinais = [
    { rotulo: 'Nenhuma cobrança vencida', ok: (vencidasCount.count ?? 0) === 0 },
    { rotulo: 'Todos os sites no ar', ok: listaSites.every((s) => s.uptime_ok !== false) },
    {
      rotulo: 'Certificados SSL válidos',
      ok: listaSites.every((s) => !s.ssl_expira || s.ssl_expira > em7),
    },
    { rotulo: 'Nenhum domínio vencendo em 7 d', ok: !listaDom.some((d) => d.expira_em! <= em7) },
    { rotulo: 'Webhooks sem falha em 24 h', ok: !logs.some((l) => l.estado === 'falhou') },
  ]

  return {
    clientesAtivos: new Set(
      ((clientes ?? []) as { cliente_id: string }[]).map((c) => c.cliente_id),
    ).size,
    dominios60d: listaDom.length,
    dominiosSemAuto: listaDom.filter((d) => d.expira_em && d.expira_em <= em7).length,
    contratos30d: {
      qtd: (novos ?? []).length,
      centavos: ((novos ?? []) as { valor_centavos: number }[]).reduce(
        (s, c) => s + Number(c.valor_centavos),
        0,
      ),
    },
    logs,
    agenda,
    saude: Math.round((sinais.filter((s) => s.ok).length / sinais.length) * 100),
    sinais,
  }
}
