/**
 * Checagem de domínio via RDAP (Compilado geral, Parte 3.7/3.12) — protocolo
 * público que substituiu o WHOIS, sem chave e sem aprovação. rdap.org
 * funciona como broker: descobre o servidor RDAP certo para cada TLD
 * (Verisign para .com, Registro.br para .com.br, etc.) e redireciona.
 *
 * Semântica padrão do protocolo: 404 = domínio livre, 200 = registrado.
 * Qualquer outra resposta (rate limit, TLD sem RDAP) fica como
 * "indeterminado" — nunca inventamos disponibilidade.
 */

export const EXTENSOES_PADRAO = ['com', 'com.br', 'net'] as const

export type ResultadoRdap = 'disponivel' | 'registrado' | 'indeterminado'

export async function checarDominio(
  termo: string,
  extensao: string,
): Promise<ResultadoRdap> {
  const { estado } = await consultarDominio(`${normalizarTermo(termo)}.${extensao}`)
  return estado
}

export type ConsultaRdap = {
  estado: ResultadoRdap
  /** Quando o registro atual vence — só vem em domínio registrado. */
  expiraEm: string | null
  registradoEm: string | null
  registrador: string | null
}

type EventoRdap = { eventAction?: string; eventDate?: string }
type EntidadeRdap = { roles?: string[]; vcardArray?: unknown }

/**
 * Consulta completa de um domínio já formado ("hayatecnologia.com.br").
 * Além do livre/registrado, extrai a data de expiração — é ela que
 * transforma o radar em algo útil: dá para vigiar um domínio ocupado e
 * saber quando ele entra em disputa.
 */
export async function consultarDominio(dominio: string): Promise<ConsultaRdap> {
  const vazio: ConsultaRdap = {
    estado: 'indeterminado',
    expiraEm: null,
    registradoEm: null,
    registrador: null,
  }

  try {
    const resposta = await fetch(`https://rdap.org/domain/${dominio}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (resposta.status === 404) return { ...vazio, estado: 'disponivel' }
    if (resposta.status !== 200) return vazio

    const corpo = (await resposta.json()) as {
      events?: EventoRdap[]
      entities?: EntidadeRdap[]
    }

    return {
      estado: 'registrado',
      expiraEm: dataDoEvento(corpo.events, 'expiration'),
      registradoEm: dataDoEvento(corpo.events, 'registration'),
      registrador: nomeDoRegistrador(corpo.entities),
    }
  } catch {
    return vazio
  }
}

function dataDoEvento(eventos: EventoRdap[] | undefined, acao: string): string | null {
  const data = eventos?.find((e) => e.eventAction === acao)?.eventDate
  if (!data) return null
  const quando = new Date(data)
  return Number.isNaN(quando.getTime()) ? null : quando.toISOString()
}

/**
 * O nome do registrador vem num vCard (RFC 7095): um array de arrays em
 * que cada entrada é [propriedade, params, tipo, valor]. Queremos o `fn`
 * da entidade com papel "registrar".
 */
function nomeDoRegistrador(entidades: EntidadeRdap[] | undefined): string | null {
  const registrar = entidades?.find((e) => e.roles?.includes('registrar'))
  const vcard = registrar?.vcardArray
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return null

  for (const campo of vcard[1] as unknown[]) {
    if (Array.isArray(campo) && campo[0] === 'fn' && typeof campo[3] === 'string') {
      return campo[3]
    }
  }
  return null
}

/** "Comunicação Visual" -> "comunicacaovisual" — só o que um domínio aceita. */
export function normalizarTermo(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
