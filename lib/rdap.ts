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
  const dominio = `${normalizarTermo(termo)}.${extensao}`

  try {
    const resposta = await fetch(`https://rdap.org/domain/${dominio}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(10_000),
    })

    if (resposta.status === 404) return 'disponivel'
    if (resposta.status === 200) return 'registrado'
    return 'indeterminado'
  } catch {
    return 'indeterminado'
  }
}

/** "Comunicação Visual" -> "comunicacaovisual" — só o que um domínio aceita. */
export function normalizarTermo(termo: string): string {
  return termo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
