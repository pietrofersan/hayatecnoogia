import { env } from './env'

/**
 * Expansão de segmento em palavras vizinhas (Compilado geral, Parte 1 módulo
 * 1 e Parte 6.1 caminho A — API de mensagens simples, sem agente).
 *
 * Gemini Flash em vez de um modelo pago: é uma tarefa mecânica, de baixo
 * risco (nunca vai ao ar com a marca do cliente) e baixo volume — cabe
 * folgado na camada gratuita do Google AI Studio (aistudio.google.com),
 * sem cartão cadastrado. Se um dia o volume justificar um modelo melhor,
 * troca-se só este arquivo.
 */

const MODELO = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`

export class ErroIA extends Error {}

type RespostaGemini = {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
}

export async function expandirSegmento(nomeSegmento: string): Promise<string[]> {
  const chave = env.geminiApiKey()
  if (!chave) {
    throw new ErroIA('GEMINI_API_KEY não configurada — veja Config.')
  }

  const resposta = await fetch(`${ENDPOINT}?key=${chave}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                `Liste de 15 a 25 termos de busca (palavras-chave) intimamente ` +
                `relacionados ao segmento de mercado "${nomeSegmento}", em ` +
                `português do Brasil — sinônimos, especializações e serviços ` +
                `correlatos que um cliente desse segmento buscaria no Google. ` +
                `Responda só com a lista, um termo por linha, sem numeração, ` +
                `sem marcadores, sem explicação.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!resposta.ok) {
    const corpo = await resposta.text()
    throw new ErroIA(`Gemini ${resposta.status}: ${corpo}`)
  }

  const dados = (await resposta.json()) as RespostaGemini

  if (dados.promptFeedback?.blockReason) {
    throw new ErroIA(`Gemini bloqueou a resposta: ${dados.promptFeedback.blockReason}`)
  }

  const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''

  return texto
    .split('\n')
    .map((linha) => linha.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean)
}
