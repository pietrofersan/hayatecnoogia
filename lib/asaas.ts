import { env } from './env'
import { centavosParaAsaas } from './money'

/**
 * Cliente da API Asaas v3 (seção 3 do blueprint).
 * Sandbox por padrão: ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
 */

export class ErroAsaas extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly corpo: unknown,
  ) {
    super(message)
    this.name = 'ErroAsaas'
  }
}

async function chamar<T>(
  caminho: string,
  init: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const url = new URL(env.asaasBaseUrl().replace(/\/$/, '') + caminho)
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v)

  const resposta = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      access_token: env.asaasApiKey(),
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const corpo = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const detalhe =
      (corpo as { errors?: { description?: string }[] } | null)?.errors?.[0]
        ?.description ?? resposta.statusText
    throw new ErroAsaas(`Asaas ${resposta.status}: ${detalhe}`, resposta.status, corpo)
  }
  return corpo as T
}

// Tipos ------------------------------------------------------------

export type AsaasCustomer = {
  id: string
  name: string
  cpfCnpj?: string
  email?: string
}

export type AsaasBillingType = 'UNDEFINED' | 'PIX' | 'BOLETO' | 'CREDIT_CARD'

export type AsaasPayment = {
  id: string
  customer: string
  subscription?: string
  value: number
  netValue?: number
  dueDate: string
  paymentDate?: string | null
  clientPaymentDate?: string | null
  billingType: AsaasBillingType
  status: string
  invoiceUrl?: string
  installmentNumber?: number | null
  description?: string
}

export type AsaasSubscription = {
  id: string
  customer: string
  value: number
  nextDueDate: string
  cycle: string
  status: string
}

// Fluxos ------------------------------------------------------------

/** 1. Cliente → Asaas */
export function criarCliente(dados: {
  name: string
  cpfCnpj?: string
  email?: string
  phone?: string
  mobilePhone?: string
  externalReference?: string
}) {
  return chamar<AsaasCustomer>('/customers', { method: 'POST', body: dados })
}

export function atualizarCliente(
  id: string,
  dados: Partial<{ name: string; email: string; mobilePhone: string; cpfCnpj: string }>,
) {
  return chamar<AsaasCustomer>(`/customers/${id}`, { method: 'POST', body: dados })
}

/**
 * 2. Contrato recorrente → assinatura mensal.
 * billingType UNDEFINED deixa o cliente escolher PIX/boleto/cartão.
 */
export function criarAssinatura(dados: {
  customer: string
  valorCentavos: number
  nextDueDate: string
  description?: string
  externalReference?: string
  cycle?: string
}) {
  return chamar<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: {
      customer: dados.customer,
      billingType: 'UNDEFINED',
      value: centavosParaAsaas(dados.valorCentavos),
      nextDueDate: dados.nextDueDate,
      cycle: dados.cycle ?? 'MONTHLY',
      description: dados.description,
      externalReference: dados.externalReference,
    },
  })
}

export function cancelarAssinatura(id: string) {
  return chamar<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, {
    method: 'DELETE',
  })
}

/** 3. Contrato parcelado — uma chamada gera todas as parcelas. */
export function criarParcelamento(dados: {
  customer: string
  totalCentavos: number
  parcelas: number
  dueDate: string
  description?: string
  externalReference?: string
}) {
  return chamar<AsaasPayment>('/payments', {
    method: 'POST',
    body: {
      customer: dados.customer,
      billingType: 'UNDEFINED',
      installmentCount: dados.parcelas,
      totalValue: centavosParaAsaas(dados.totalCentavos),
      dueDate: dados.dueDate,
      description: dados.description,
      externalReference: dados.externalReference,
    },
  })
}

/** 4. Avulso */
export function criarCobranca(dados: {
  customer: string
  valorCentavos: number
  dueDate: string
  description?: string
  externalReference?: string
}) {
  return chamar<AsaasPayment>('/payments', {
    method: 'POST',
    body: {
      customer: dados.customer,
      billingType: 'UNDEFINED',
      value: centavosParaAsaas(dados.valorCentavos),
      dueDate: dados.dueDate,
      description: dados.description,
      externalReference: dados.externalReference,
    },
  })
}

export function buscarCobranca(id: string) {
  return chamar<AsaasPayment>(`/payments/${id}`)
}

export function listarCobrancasDaAssinatura(subscriptionId: string) {
  return chamar<{ data: AsaasPayment[] }>(`/subscriptions/${subscriptionId}/payments`)
}

/**
 * Tradução do status do Asaas para o enum status_cobranca.
 * Retorna null quando o evento não altera o status local.
 */
export function statusLocal(statusAsaas: string) {
  switch (statusAsaas) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pendente' as const
    case 'CONFIRMED':
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'paga' as const
    case 'OVERDUE':
      return 'vencida' as const
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
      return 'estornada' as const
    case 'DELETED':
      return 'cancelada' as const
    default:
      return null
  }
}
