import { env } from './env'

/**
 * Expansão de segmento em palavras vizinhas (Compilado geral, Parte 1 módulo
 * 1 e Parte 6.1 caminho A — API de mensagens simples, sem agente).
 * Haiku 4.5 por recomendação da Parte 15: tarefa mecânica, alto volume,
 * resposta curta — não é texto que vai ao ar com a marca do cliente.
 */

const MODELO = 'claude-haiku-4-5-20251001'

export class ErroIA extends Error {}

export async function expandirSegmento(nomeSegmento: string): Promise<string[]> {
  const chave = env.anthropicApiKey()
  if (!chave) {
    throw new ErroIA('ANTHROPIC_API_KEY não configurada — veja Config.')
  }

  const resposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': chave,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content:
            `Liste de 15 a 25 termos de busca (palavras-chave) intimamente ` +
            `relacionados ao segmento de mercado "${nomeSegmento}", em ` +
            `português do Brasil — sinônimos, especializações e serviços ` +
            `correlatos que um cliente desse segmento buscaria no Google. ` +
            `Responda só com a lista, um termo por linha, sem numeração, ` +
            `sem marcadores, sem explicação.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!resposta.ok) {
    const corpo = await resposta.text()
    throw new ErroIA(`Anthropic ${resposta.status}: ${corpo}`)
  }

  const dados = (await resposta.json()) as {
    content: { type: string; text?: string }[]
  }
  const texto = dados.content.find((b) => b.type === 'text')?.text ?? ''

  return texto
    .split('\n')
    .map((linha) => linha.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean)
}
