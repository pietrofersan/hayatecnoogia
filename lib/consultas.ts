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
