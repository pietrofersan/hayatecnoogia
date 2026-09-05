import { supabaseServidor } from './supabase'
import { formatBRL } from './money'

export type SeveridadeAlerta = 'critico' | 'atencao'

export type OrigemAlerta =
  | 'dominios'
  | 'cobrancas'
  | 'contratos'
  | 'leads'
  | 'sites'
  | 'integracoes'

export type Alerta = {
  /** chave determinística: o mesmo problema gera sempre a mesma chave */
  chave: string
  severidade: SeveridadeAlerta
  origem: OrigemAlerta
  titulo: string
  meta: string
  /** tela que resolve o alerta */
  href: string
}

export const ROTULO_ORIGEM: Record<OrigemAlerta, string> = {
  dominios: 'Domínios',
  cobrancas: 'Cobranças',
  contratos: 'Contratos',
  leads: 'Leads',
  sites: 'Sites',
  integracoes: 'Integrações',
}

const DIA = 864e5

function dias(ate: string | null): number | null {
  if (!ate) return null
  const alvo = new Date(ate).getTime()
  if (Number.isNaN(alvo)) return null
  return Math.ceil((alvo - Date.now()) / DIA)
}

function prazo(d: number): string {
  if (d < 0) return `venceu há ${Math.abs(d)} d`
  if (d === 0) return 'vence hoje'
  return `vence em ${d} d`
}

function dataCurta(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

/**
 * Central de alertas (README §10): a lista é sempre derivada do estado atual
 * dos módulos — nada é gravado quando o problema aparece. O que persiste é a
 * baixa, em `alertas_resolvidos`, para o item sumir daqui e do dashboard.
 */
export async function listarAlertas(): Promise<Alerta[]> {
  const supabase = await supabaseServidor()
  const em30 = new Date(Date.now() + 30 * DIA).toISOString().slice(0, 10)
  const em15 = new Date(Date.now() + 15 * DIA).toISOString().slice(0, 10)
  const ha24h = new Date(Date.now() - DIA).toISOString()
  const ha1h = new Date(Date.now() - 36e5).toISOString()
  const ha7d = new Date(Date.now() - 7 * DIA).toISOString()

  const [
    { data: vencidas },
    { data: dominios },
    { data: sites },
    { data: contratos },
    { data: leads },
    { data: webhooks },
    { data: resolvidos },
  ] = await Promise.all([
    supabase
      .from('cobrancas')
      .select('id, valor_centavos, vencimento, contratos(codigo, clientes(nome))')
      .eq('status', 'vencida')
      .order('vencimento'),
    supabase
      .from('dominios_radar')
      .select('id, dominio, expira_em, registrador, clientes(nome)')
      .eq('ativo', true)
      .not('expira_em', 'is', null)
      .lte('expira_em', em30)
      .order('expira_em'),
    supabase
      .from('sites')
      .select('id, dominio, ssl_expira, uptime_ok, checado_em')
      .or(`ssl_expira.lte.${em15},uptime_ok.eq.false`),
    supabase
      .from('contratos')
      .select('id, codigo, criado_em, clientes(nome)')
      .eq('status', 'enviado')
      .lte('criado_em', ha7d),
    supabase
      .from('leads')
      .select('id, nome, site, criado_em')
      .eq('lido', false)
      .lte('criado_em', ha1h)
      .order('criado_em'),
    supabase
      .from('webhook_logs')
      .select('id, origem, evento, erro, recebido_em')
      .not('erro', 'is', null)
      .gte('recebido_em', ha24h)
      .order('recebido_em', { ascending: false }),
    supabase.from('alertas_resolvidos').select('chave'),
  ])

  type Cob = {
    id: string
    valor_centavos: number
    vencimento: string
    contratos: { codigo: string; clientes: { nome: string } | null } | null
  }
  type Dom = {
    id: string
    dominio: string
    expira_em: string | null
    registrador: string | null
    clientes: { nome: string } | null
  }
  type Sit = {
    id: string
    dominio: string
    ssl_expira: string | null
    uptime_ok: boolean | null
    checado_em: string | null
  }
  type Con = { id: string; codigo: string; criado_em: string; clientes: { nome: string } | null }
  type Led = { id: string; nome: string | null; site: string | null; criado_em: string }
  type Hook = {
    id: number
    origem: string
    evento: string | null
    erro: string | null
    recebido_em: string
  }

  const lista: Alerta[] = []

  for (const c of (vencidas ?? []) as unknown as Cob[]) {
    const d = dias(c.vencimento) ?? 0
    lista.push({
      chave: `cobranca:vencida:${c.id}`,
      severidade: 'critico',
      origem: 'cobrancas',
      titulo: `${c.contratos?.clientes?.nome ?? 'Cliente sem nome'} · cobrança em atraso`,
      meta: `${formatBRL(Number(c.valor_centavos))} · ${c.contratos?.codigo ?? '—'} · ${prazo(d)}`,
      href: '/cobrancas',
    })
  }

  for (const d of (dominios ?? []) as unknown as Dom[]) {
    const faltam = dias(d.expira_em)
    if (faltam === null) continue
    lista.push({
      chave: `dominio:vence:${d.id}`,
      severidade: faltam <= 7 ? 'critico' : 'atencao',
      origem: 'dominios',
      titulo: `${d.dominio} ${prazo(faltam)}`,
      meta: `${d.clientes?.nome ?? 'sem cliente'} · ${d.registrador ?? 'registrador desconhecido'} · ${dataCurta(d.expira_em)}`,
      href: '/dominios',
    })
  }

  for (const s of (sites ?? []) as unknown as Sit[]) {
    if (s.uptime_ok === false) {
      lista.push({
        chave: `site:fora:${s.id}`,
        severidade: 'critico',
        origem: 'sites',
        titulo: `${s.dominio} fora do ar`,
        meta: `última checagem ${s.checado_em ? dataCurta(s.checado_em) : 'nunca'}`,
        href: '/dominios',
      })
    }
    const ssl = dias(s.ssl_expira)
    if (ssl !== null) {
      lista.push({
        chave: `site:ssl:${s.id}`,
        severidade: ssl <= 3 ? 'critico' : 'atencao',
        origem: 'sites',
        titulo: `Certificado SSL de ${s.dominio} ${prazo(ssl)}`,
        meta: `expira em ${dataCurta(s.ssl_expira)}`,
        href: '/dominios',
      })
    }
  }

  for (const c of (contratos ?? []) as unknown as Con[]) {
    const parado = Math.abs(dias(c.criado_em) ?? 0)
    lista.push({
      chave: `contrato:parado:${c.id}`,
      severidade: 'atencao',
      origem: 'contratos',
      titulo: `${c.codigo} enviado e sem assinatura`,
      meta: `${c.clientes?.nome ?? 'cliente sem nome'} · parado há ${parado} d`,
      href: '/contratos',
    })
  }

  for (const l of (leads ?? []) as unknown as Led[]) {
    lista.push({
      chave: `lead:sem-contato:${l.id}`,
      severidade: 'atencao',
      origem: 'leads',
      titulo: `${l.nome ?? 'Lead sem nome'} sem contato`,
      meta: `${l.site ?? 'landing desconhecida'} · SLA de 1 h estourado`,
      href: '/leads',
    })
  }

  for (const h of (webhooks ?? []) as unknown as Hook[]) {
    lista.push({
      chave: `webhook:erro:${h.id}`,
      severidade: 'critico',
      origem: 'integracoes',
      titulo: `Falha no webhook ${h.origem}`,
      meta: `${h.evento ?? 'evento desconhecido'} · ${h.erro?.slice(0, 80) ?? ''}`,
      href: '/integracoes',
    })
  }

  const baixados = new Set(
    ((resolvidos ?? []) as { chave: string }[]).map((r) => r.chave),
  )

  const peso = { critico: 0, atencao: 1 }
  return lista
    .filter((a) => !baixados.has(a.chave))
    .sort((a, b) => peso[a.severidade] - peso[b.severidade])
}

/** Quantos alertas foram baixados hoje — KPI "Resolvidos hoje" (§10). */
export async function resolvidosHoje(): Promise<number> {
  const supabase = await supabaseServidor()
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('alertas_resolvidos')
    .select('chave', { count: 'exact', head: true })
    .gte('resolvido_em', inicio.toISOString())
  return count ?? 0
}
