/** Validação de CPF/CNPJ — o banco guarda só dígitos. */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function validaCPF(entrada: string): boolean {
  const cpf = somenteDigitos(entrada)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  for (const [tamanho, posicao] of [
    [9, 10],
    [10, 11],
  ]) {
    let soma = 0
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (posicao - i)
    const resto = (soma * 10) % 11 % 10
    if (resto !== Number(cpf[tamanho])) return false
  }
  return true
}

export function validaCNPJ(entrada: string): boolean {
  const cnpj = somenteDigitos(entrada)
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
  const calcula = (tamanho: number) => {
    let soma = 0
    let peso = tamanho - 7
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * peso--
      if (peso < 2) peso = 9
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }
  return calcula(12) === Number(cnpj[12]) && calcula(13) === Number(cnpj[13])
}

export function validaDocumento(entrada: string): boolean {
  const d = somenteDigitos(entrada)
  if (d.length === 11) return validaCPF(d)
  if (d.length === 14) return validaCNPJ(d)
  return false
}

export function formataDocumento(entrada: string | null | undefined): string {
  if (!entrada) return '—'
  const d = somenteDigitos(entrada)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return entrada
}
