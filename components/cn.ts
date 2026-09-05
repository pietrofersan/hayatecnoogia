/** Junta classes ignorando falsos — sem dependência externa. */
export function cn(...partes: Array<string | false | null | undefined>) {
  return partes.filter(Boolean).join(' ')
}
