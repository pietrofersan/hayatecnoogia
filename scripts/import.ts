/**
 * Migração dos clientes atuais (seção 9 do blueprint).
 *
 *   npm run import -- clientes.csv           # simulação (não grava)
 *   npm run import -- clientes.csv --aplicar # grava e espelha no Asaas
 *
 * O CSV segue a planilha modelo:
 *   nome,documento,email,telefone,whatsapp,frente,tipo,modo,valor,parcelas,dia_vencimento,inicio,descricao
 *
 * Regra da migração: cria cliente + contrato e espelha o cliente no Asaas,
 * SEM disparar cobrança retroativa. A primeira cobrança pelo Master é a do
 * ciclo seguinte — o mês corrente continua no fluxo antigo.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

type Linha = Record<string, string>

const CABECALHOS = [
  'nome',
  'documento',
  'email',
  'telefone',
  'whatsapp',
  'frente',
  'tipo',
  'modo',
  'valor',
  'parcelas',
  'dia_vencimento',
  'inicio',
  'descricao',
] as const

function lerCsv(caminho: string): Linha[] {
  const texto = readFileSync(caminho, 'utf8').replace(/^﻿/, '').trim()
  const [cabecalho, ...linhas] = texto.split(/\r?\n/)
  const colunas = cabecalho.split(',').map((c) => c.trim())

  const faltando = CABECALHOS.filter((c) => !colunas.includes(c))
  if (faltando.length) {
    throw new Error(`Colunas ausentes na planilha: ${faltando.join(', ')}`)
  }

  return linhas
    .filter((l) => l.trim())
    .map((linha) => {
      const valores = dividirLinha(linha)
      return Object.fromEntries(colunas.map((c, i) => [c, (valores[i] ?? '').trim()]))
    })
}

/** Divide respeitando aspas duplas (campos com vírgula na descrição). */
function dividirLinha(linha: string): string[] {
  const saida: string[] = []
  let atual = ''
  let dentroDeAspas = false

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else dentroDeAspas = !dentroDeAspas
    } else if (c === ',' && !dentroDeAspas) {
      saida.push(atual)
      atual = ''
    } else atual += c
  }
  saida.push(atual)
  return saida
}

function paraCentavos(entrada: string): number {
  const limpo = entrada.replace(/[^\d,.-]/g, '')
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = Number(normalizado)
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Valor inválido: ${entrada}`)
  return Math.round(n * 100)
}

async function principal() {
  const [caminho, ...flags] = process.argv.slice(2)
  if (!caminho) {
    console.error('Uso: npm run import -- <planilha.csv> [--aplicar]')
    process.exit(1)
  }
  const aplicar = flags.includes('--aplicar')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (aplicar && (!url || !chave)) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
  }

  const linhas = lerCsv(caminho)
  console.log(`${linhas.length} linha(s) lida(s) de ${caminho}`)
  if (!aplicar) console.log('Modo simulação — nada será gravado. Use --aplicar para valer.\n')

  const supabase = aplicar ? createClient(url!, chave!) : null
  const asaasChave = process.env.ASAAS_API_KEY
  const asaasBase = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3'

  let importados = 0

  for (const [indice, linha] of linhas.entries()) {
    const rotulo = `${indice + 2}: ${linha.nome}`
    try {
      const valorCentavos = paraCentavos(linha.valor)
      const documento = linha.documento.replace(/\D/g, '')
      const dia = linha.dia_vencimento ? Number(linha.dia_vencimento) : null
      if (dia !== null && (dia < 1 || dia > 28)) {
        throw new Error(`dia de vencimento fora de 1–28: ${linha.dia_vencimento}`)
      }

      if (!aplicar) {
        console.log(
          `· ${rotulo} — ${linha.frente}/${linha.tipo} ${linha.modo} ` +
            `R$ ${(valorCentavos / 100).toFixed(2)} dia ${dia ?? '—'}`,
        )
        importados++
        continue
      }

      const { data: cliente, error: erroCliente } = await supabase!
        .from('clientes')
        .insert({
          nome: linha.nome,
          documento: documento || null,
          email: linha.email || null,
          telefone: linha.telefone || null,
          whatsapp: linha.whatsapp || null,
        })
        .select('id')
        .single()
      if (erroCliente) throw erroCliente

      // Espelho no Asaas — cliente apenas; nenhuma cobrança é criada aqui.
      if (asaasChave) {
        const resposta = await fetch(`${asaasBase.replace(/\/$/, '')}/customers`, {
          method: 'POST',
          headers: { access_token: asaasChave, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: linha.nome,
            cpfCnpj: documento || undefined,
            email: linha.email || undefined,
            mobilePhone: linha.whatsapp || linha.telefone || undefined,
            externalReference: cliente.id,
          }),
        })
        if (resposta.ok) {
          const { id } = (await resposta.json()) as { id: string }
          await supabase!.from('clientes').update({ asaas_customer_id: id }).eq('id', cliente.id)
        } else {
          console.warn(`  ! Asaas recusou ${linha.nome}: ${await resposta.text()}`)
        }
      }

      const { error: erroContrato } = await supabase!.from('contratos').insert({
        cliente_id: cliente.id,
        frente: linha.frente,
        tipo: linha.tipo,
        descricao: linha.descricao || null,
        modo: linha.modo,
        valor_centavos: valorCentavos,
        parcelas: linha.modo === 'parcelado' ? Number(linha.parcelas || 0) || null : null,
        dia_vencimento: dia,
        inicio: linha.inicio || null,
        // Migração entra como 'ativo' sem assinatura no Asaas: a recorrência
        // é criada no ciclo seguinte, pela tela de Contratos.
        status: 'ativo',
      })
      if (erroContrato) throw erroContrato

      console.log(`✓ ${rotulo}`)
      importados++
    } catch (erro) {
      console.error(`✗ ${rotulo} — ${erro instanceof Error ? erro.message : erro}`)
    }
  }

  console.log(`\n${importados}/${linhas.length} processada(s).`)
}

principal().catch((erro) => {
  console.error(erro)
  process.exit(1)
})
