import { NextResponse } from 'next/server'
import * as asaas from '@/lib/asaas'
import type { Cliente, Contrato } from '@/lib/db'
import { env } from '@/lib/env'
import { proximoVencimento } from '@/lib/money'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EventoZapSign = {
  event_type?: string
  status?: string
  token?: string
  signed_file?: string | null
}

/**
 * Webhook da ZapSign (seção 4.3).
 * doc_signed → contrato assinado → gatilho: cria a cobrança no Asaas conforme
 * o modo do contrato (Gerado → Enviado → Assinado → Cobrança ativa).
 *
 * A ZapSign não assina o payload, então a URL registrada leva o token em
 * ?t= — ele é comparado com ZAPSIGN_WEBHOOK_TOKEN.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('t')
  if (!token || token !== env.zapsignWebhookToken()) {
    return NextResponse.json({ erro: 'token inválido' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const corpo = (await request.json().catch(() => null)) as EventoZapSign | null

  const { data: log } = await supabase
    .from('webhook_logs')
    .insert({
      origem: 'zapsign',
      evento: corpo?.event_type ?? corpo?.status ?? null,
      payload: corpo,
    })
    .select('id')
    .single()

  const finalizar = async (erro?: string) => {
    if (log) {
      await supabase
        .from('webhook_logs')
        .update(erro ? { erro } : { processado: true })
        .eq('id', log.id)
    }
    return NextResponse.json(erro ? { ok: false, erro } : { ok: true })
  }

  if (!corpo?.token) return finalizar('payload sem token do documento')

  const assinado =
    corpo.event_type === 'doc_signed' || corpo.status === 'signed'

  const { data: contratoBruto, error } = await supabase
    .from('contratos')
    .select('*, clientes(*), assinaturas(id)')
    .eq('zapsign_doc_id', corpo.token)
    .maybeSingle()

  if (error) return finalizar(error.message)
  if (!contratoBruto) return finalizar(`nenhum contrato com zapsign_doc_id ${corpo.token}`)

  const contrato = contratoBruto as unknown as Contrato & {
    clientes: Cliente | null
    assinaturas: { id: string }[]
  }

  await supabase
    .from('contratos')
    .update({
      zapsign_status: corpo.status ?? corpo.event_type ?? null,
      ...(assinado && contrato.status === 'enviado' ? { status: 'assinado' } : {}),
    })
    .eq('id', contrato.id)

  if (!assinado) return finalizar()

  // Gatilho da cobrança — só uma vez por contrato.
  if (contrato.status === 'ativo' || contrato.assinaturas.length > 0) return finalizar()

  const cliente = contrato.clientes
  if (!cliente?.asaas_customer_id) {
    return finalizar('cliente sem asaas_customer_id: cobrança não criada')
  }

  try {
    const vencimento = proximoVencimento(contrato.dia_vencimento ?? 10)
    const descricao = `${contrato.codigo} · ${contrato.tipo}`

    if (contrato.modo === 'recorrente') {
      const assinatura = await asaas.criarAssinatura({
        customer: cliente.asaas_customer_id,
        valorCentavos: Number(contrato.valor_centavos),
        nextDueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
      await supabase.from('assinaturas').insert({
        contrato_id: contrato.id,
        asaas_subscription_id: assinatura.id,
        ciclo: assinatura.cycle,
        proxima_cobranca: assinatura.nextDueDate,
      })
    } else if (contrato.modo === 'parcelado') {
      await asaas.criarParcelamento({
        customer: cliente.asaas_customer_id,
        totalCentavos: Number(contrato.valor_centavos),
        parcelas: contrato.parcelas ?? 2,
        dueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
    } else {
      await asaas.criarCobranca({
        customer: cliente.asaas_customer_id,
        valorCentavos: Number(contrato.valor_centavos),
        dueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
    }

    await supabase.from('contratos').update({ status: 'ativo' }).eq('id', contrato.id)
    return finalizar()
  } catch (erro) {
    return finalizar(erro instanceof Error ? erro.message : String(erro))
  }
}
