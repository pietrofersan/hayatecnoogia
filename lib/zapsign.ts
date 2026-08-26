import { env } from './env'

/**
 * Cliente da API ZapSign (seção 4 do blueprint).
 * Sandbox: ZAPSIGN_BASE_URL=https://sandbox.api.zapsign.com.br/api/v1
 */

export class ErroZapSign extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly corpo: unknown,
  ) {
    super(message)
    this.name = 'ErroZapSign'
  }
}

async function chamar<T>(caminho: string, init: { method?: string; body?: unknown } = {}) {
  const resposta = await fetch(env.zapsignBaseUrl().replace(/\/$/, '') + caminho, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${env.zapsignToken()}`,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })

  const corpo = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new ErroZapSign(
      `ZapSign ${resposta.status}: ${JSON.stringify(corpo ?? resposta.statusText)}`,
      resposta.status,
      corpo,
    )
  }
  return corpo as T
}

export type ZapSignSigner = {
  token: string
  name: string
  email?: string
  phone_number?: string
  status: string
  sign_url: string
}

export type ZapSignDoc = {
  token: string
  name: string
  status: string
  original_file: string
  signed_file: string | null
  signers: ZapSignSigner[]
}

/**
 * Cria o documento a partir do PDF gerado (base64) e do signatário do cliente.
 * `signer.phone_number` habilita o envio por WhatsApp.
 */
export function criarDocumento(dados: {
  nome: string
  pdfBase64: string
  signatario: { nome: string; email?: string; telefone?: string }
  urlWebhook?: string
}) {
  return chamar<ZapSignDoc>('/docs/', {
    method: 'POST',
    body: {
      name: dados.nome,
      base64_pdf: dados.pdfBase64,
      lang: 'pt-br',
      signature_placement: 'last-page',
      url_webhook: dados.urlWebhook,
      signers: [
        {
          name: dados.signatario.nome,
          email: dados.signatario.email,
          phone_country: dados.signatario.telefone ? '55' : undefined,
          phone_number: dados.signatario.telefone,
          send_automatic_email: Boolean(dados.signatario.email),
          send_automatic_whatsapp: Boolean(dados.signatario.telefone),
          auth_mode: 'assinaturaTela',
        },
      ],
    },
  })
}

export function buscarDocumento(token: string) {
  return chamar<ZapSignDoc>(`/docs/${token}/`)
}

/** Renderiza um template preenchendo as merge tags {{caminho.da.chave}}. */
export function aplicarMergeTags(
  html: string,
  dados: Record<string, unknown>,
): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (original, caminho: string) => {
    const valor = caminho
      .split('.')
      .reduce<unknown>(
        (atual, chave) =>
          atual && typeof atual === 'object'
            ? (atual as Record<string, unknown>)[chave]
            : undefined,
        dados,
      )
    return valor === undefined || valor === null ? original : String(valor)
  })
}
