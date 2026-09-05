import { env } from './env'

/**
 * Toda chamada de IA do Master passa por aqui (Compilado geral, Parte 6.1
 * caminho A — API de mensagens simples, sem agente).
 *
 * Gemini Flash em vez de um modelo pago: são tarefas mecânicas, de baixo
 * risco (nada vai ao ar sem alguém aprovar) e baixo volume — cabe folgado
 * na camada gratuita do Google AI Studio (aistudio.google.com), sem cartão
 * cadastrado. Se um dia o volume justificar um modelo melhor, troca-se só
 * este arquivo.
 */

const MODELO = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`

export const MODELO_IA = MODELO

export class ErroIA extends Error {}

type RespostaGemini = {
  candidates?: {
    content?: { parts?: { text?: string }[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
}

/** Chamada crua: devolve o texto do candidato ou explode com ErroIA. */
async function chamarGemini(
  prompt: string,
  generationConfig: Record<string, unknown>,
): Promise<string> {
  const chave = env.geminiApiKey()
  if (!chave) {
    throw new ErroIA('GEMINI_API_KEY não configurada — veja Config.')
  }

  const resposta = await fetch(`${ENDPOINT}?key=${chave}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!resposta.ok) {
    const corpo = await resposta.text()
    throw new ErroIA(`Gemini ${resposta.status}: ${corpo}`)
  }

  const dados = (await resposta.json()) as RespostaGemini

  if (dados.promptFeedback?.blockReason) {
    throw new ErroIA(`Gemini bloqueou a resposta: ${dados.promptFeedback.blockReason}`)
  }

  return dados.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
}

export async function expandirSegmento(nomeSegmento: string): Promise<string[]> {
  const texto = await chamarGemini(
    `Liste de 15 a 25 termos de busca (palavras-chave) intimamente ` +
      `relacionados ao segmento de mercado "${nomeSegmento}", em ` +
      `português do Brasil — sinônimos, especializações e serviços ` +
      `correlatos que um cliente desse segmento buscaria no Google. ` +
      `Responda só com a lista, um termo por linha, sem numeração, ` +
      `sem marcadores, sem explicação.`,
    { temperature: 0.4, maxOutputTokens: 1024 },
  )

  return texto
    .split('\n')
    .map((linha) => linha.replace(/^[-•\d.)\s]+/, '').trim())
    .filter(Boolean)
}

// Geração de conteúdo (Intelligence §7) --------------------------------

export type PecaGerada = { titulo: string; trecho: string; corpo: string }

/** Como escrever para cada canal — muda formato, não o assunto. */
const FORMATO_CANAL: Record<string, string> = {
  instagram:
    'post de Instagram: título curto e direto (até 60 caracteres), legenda de 3 a 5 frases com uma chamada para ação no fim',
  facebook:
    'post de Facebook: título curto, texto de 4 a 6 frases, tom mais explicativo que o Instagram',
  tiktok:
    'roteiro de vídeo curto de TikTok: título gancho, e o corpo em falas de narração separadas por linha, com no máximo 45 segundos de leitura',
  blog: 'artigo de blog: título otimizado para busca, e o corpo com 3 a 4 parágrafos',
  youtube:
    'roteiro de vídeo de YouTube: título de até 70 caracteres, e o corpo com abertura, desenvolvimento em tópicos e encerramento',
}

/**
 * Gera peças para um canal. Sai sempre em `aguardando` na tela — quem
 * chama esta função nunca marca nada como aprovado (Intelligence: "nenhum
 * post sai sem aprovação humana").
 */
export async function gerarPecas(
  cliente: string,
  canal: string,
  tema: string,
  quantidade: number,
): Promise<PecaGerada[]> {
  const formato = FORMATO_CANAL[canal] ?? FORMATO_CANAL.blog

  const texto = await chamarGemini(
    `Você escreve para a agência HAYA, para o cliente "${cliente}".\n` +
      `Gere ${quantidade} peça(s) de conteúdo em português do Brasil sobre: ${tema}.\n` +
      `Formato de cada peça: ${formato}.\n` +
      `Escreva como a marca falando com o cliente final — sem jargão de marketing, ` +
      `sem prometer resultado que não se pode garantir, sem inventar dado, preço ou estatística.\n` +
      `Responda em JSON: uma lista de objetos com as chaves "titulo", "trecho" ` +
      `(uma frase de resumo) e "corpo" (o texto completo da peça).`,
    {
      temperature: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            titulo: { type: 'STRING' },
            trecho: { type: 'STRING' },
            corpo: { type: 'STRING' },
          },
          required: ['titulo', 'trecho', 'corpo'],
        },
      },
    },
  )

  return interpretarPecas(texto)
}

/**
 * O `responseSchema` do Gemini já devolve JSON puro, mas modelo é modelo:
 * se vier cercado de crase ou com texto em volta, ainda assim aproveitamos
 * o que dá — melhor que perder a geração inteira por causa de formatação.
 */
export function interpretarPecas(texto: string): PecaGerada[] {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const inicio = limpo.indexOf('[')
  const fim = limpo.lastIndexOf(']')
  const candidato = inicio >= 0 && fim > inicio ? limpo.slice(inicio, fim + 1) : limpo

  let bruto: unknown
  try {
    bruto = JSON.parse(candidato)
  } catch {
    throw new ErroIA('A IA não devolveu JSON válido — tente gerar de novo.')
  }

  if (!Array.isArray(bruto)) {
    throw new ErroIA('A IA não devolveu uma lista de peças.')
  }

  const pecas = bruto
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => ({
      titulo: String(p.titulo ?? '').trim(),
      trecho: String(p.trecho ?? '').trim(),
      corpo: String(p.corpo ?? '').trim(),
    }))
    .filter((p) => p.titulo && p.corpo)

  if (pecas.length === 0) {
    throw new ErroIA('A IA respondeu, mas nenhuma peça veio com título e corpo.')
  }

  return pecas
}
