import { NextResponse } from 'next/server'
import { z } from 'zod'
import { notificarInterno } from '@/lib/notificacoes'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ingresso público de leads (seção 5).
 * A tabela `leads` tem RLS fechada — a escrita passa por aqui, com a chave
 * do site validada, honeypot anti-spam e rate limit por IP.
 */

const esquema = z.object({
  nome: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable().or(z.literal('')),
  telefone: z.string().trim().max(50).optional().nullable(),
  mensagem: z.string().trim().max(4000).optional().nullable(),
  consentimento: z.boolean().optional(),
  origem: z.record(z.unknown()).optional(),
  empresa: z.string().optional().nullable(), // honeypot: humano deixa vazio
})

// Rate limit em memória: suficiente para F1 (uma região, poucos leads/min).
const JANELA_MS = 60_000
const LIMITE = 5
const acessos = new Map<string, number[]>()

function excedeuLimite(ip: string): boolean {
  const agora = Date.now()
  const recentes = (acessos.get(ip) ?? []).filter((t) => agora - t < JANELA_MS)
  recentes.push(agora)
  acessos.set(ip, recentes)
  if (acessos.size > 5_000) acessos.clear()
  return recentes.length > LIMITE
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  const { siteKey } = await params
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconhecido'

  if (excedeuLimite(ip)) {
    return NextResponse.json({ erro: 'muitas requisições' }, { status: 429, headers: CORS })
  }

  const analise = esquema.safeParse(await request.json().catch(() => null))
  if (!analise.success) {
    return NextResponse.json({ erro: 'payload inválido' }, { status: 400, headers: CORS })
  }
  const dados = analise.data

  // Honeypot preenchido: responde 200 para não ensinar o bot, mas não grava.
  if (dados.empresa) return NextResponse.json({ ok: true }, { headers: CORS })

  const supabase = supabaseAdmin()
  const { data: site } = await supabase
    .from('sites')
    .select('id, cliente_id, dominio')
    .eq('site_key', siteKey)
    .maybeSingle()

  if (!site) {
    return NextResponse.json({ erro: 'site não encontrado' }, { status: 404, headers: CORS })
  }

  if (!dados.consentimento) {
    return NextResponse.json(
      { erro: 'consentimento LGPD obrigatório' },
      { status: 400, headers: CORS },
    )
  }

  const { error } = await supabase.from('leads').insert({
    cliente_id: site.cliente_id,
    site_id: site.id,
    site: site.dominio,
    nome: dados.nome || null,
    email: dados.email || null,
    telefone: dados.telefone || null,
    mensagem: dados.mensagem || null,
    origem: dados.origem ?? null,
    consentimento: true,
  })

  await supabase.from('webhook_logs').insert({
    origem: 'leadform',
    evento: site.dominio,
    payload: { ...dados, empresa: undefined, ip },
    processado: !error,
    erro: error?.message ?? null,
  })

  if (error) {
    return NextResponse.json({ erro: 'falha ao registrar' }, { status: 500, headers: CORS })
  }

  await notificarInterno(
    `[Master] Novo lead — ${site.dominio}`,
    [
      `Nome: ${dados.nome || '—'}`,
      `E-mail: ${dados.email || '—'}`,
      `Telefone: ${dados.telefone || '—'}`,
      '',
      dados.mensagem || '(sem mensagem)',
    ].join('\n'),
  )

  return NextResponse.json({ ok: true }, { headers: CORS })
}
