'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as asaas from './asaas'
import type { Cliente, Contrato, DominioRadar, TemplateContrato } from './db'
import { moldurarContrato, htmlParaPdf } from './pdf'
import { supabaseServidor } from './supabase'
import { formatBRL, parseParaCentavos, proximoVencimento } from './money'
import { somenteDigitos, validaDocumento } from './validacao'
import { aplicarMergeTags, criarDocumento } from './zapsign'
import { env } from './env'
import { ErroIA, expandirSegmento } from './ia'
import { EXTENSOES_PADRAO, checarDominio } from './rdap'
import { reconsultarRadar } from './radar'

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string }

const esquemaCliente = z.object({
  nome: z.string().min(2, 'Informe o nome ou razão social.'),
  nome_fantasia: z.string().optional(),
  documento: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  observacoes: z.string().optional(),
})

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? '').trim()
}

/**
 * Fluxo 1 do blueprint: cria o cliente no Master e espelha no Asaas.
 * Com o campo `id` preenchido, atualiza em vez de criar.
 * Se o Asaas falhar, o cliente continua salvo — o espelho pode ser refeito
 * depois pela ficha; a operação nunca fica bloqueada por integração.
 */
export async function salvarCliente(_estado: unknown, formData: FormData): Promise<Resultado> {
  const analise = esquemaCliente.safeParse({
    nome: texto(formData, 'nome'),
    nome_fantasia: texto(formData, 'nome_fantasia'),
    documento: texto(formData, 'documento'),
    email: texto(formData, 'email'),
    telefone: texto(formData, 'telefone'),
    whatsapp: texto(formData, 'whatsapp'),
    observacoes: texto(formData, 'observacoes'),
  })
  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message }
  }

  const dados = analise.data
  const documento = dados.documento ? somenteDigitos(dados.documento) : ''
  if (documento && !validaDocumento(documento)) {
    return { ok: false, erro: 'CPF/CNPJ inválido.' }
  }

  const campos = {
    nome: dados.nome,
    nome_fantasia: dados.nome_fantasia || null,
    documento: documento || null,
    email: dados.email || null,
    telefone: dados.telefone || null,
    whatsapp: dados.whatsapp || null,
    observacoes: dados.observacoes || null,
  }

  const supabase = await supabaseServidor()
  const id = texto(formData, 'id')

  if (id) {
    const { data: existente, error } = await supabase
      .from('clientes')
      .update(campos)
      .eq('id', id)
      .select('id, asaas_customer_id')
      .single()

    if (error || !existente) {
      return { ok: false, erro: error?.message ?? 'Falha ao atualizar o cliente.' }
    }

    // Mantém o espelho do Asaas em dia; falha aqui não desfaz a edição.
    if (existente.asaas_customer_id) {
      try {
        await asaas.atualizarCliente(existente.asaas_customer_id, {
          name: dados.nome,
          cpfCnpj: documento || undefined,
          email: dados.email || undefined,
          mobilePhone: dados.whatsapp || dados.telefone || undefined,
        })
      } catch (erro) {
        console.error('[asaas] atualização do cliente falhou', erro)
      }
    }

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${id}`)
    return { ok: true, id }
  }

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert(campos)
    .select('id')
    .single()

  if (error || !cliente) {
    return { ok: false, erro: error?.message ?? 'Falha ao salvar o cliente.' }
  }

  try {
    const noAsaas = await asaas.criarCliente({
      name: dados.nome,
      cpfCnpj: documento || undefined,
      email: dados.email || undefined,
      mobilePhone: dados.whatsapp || dados.telefone || undefined,
      externalReference: cliente.id,
    })
    await supabase
      .from('clientes')
      .update({ asaas_customer_id: noAsaas.id })
      .eq('id', cliente.id)
  } catch (erro) {
    console.error('[asaas] espelho do cliente falhou', erro)
  }

  revalidatePath('/clientes')
  return { ok: true, id: cliente.id }
}

/**
 * Refaz o espelho no Asaas de um cliente que ficou sem `asaas_customer_id`
 * — o contrato não vira cobrança enquanto esse elo não existir.
 */
export async function espelharNoAsaas(clienteId: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single()

  if (error || !data) return { ok: false, erro: 'Cliente não encontrado.' }
  const cliente = data as Cliente
  if (cliente.asaas_customer_id) return { ok: true, id: cliente.id }

  try {
    const noAsaas = await asaas.criarCliente({
      name: cliente.nome,
      cpfCnpj: cliente.documento ?? undefined,
      email: cliente.email ?? undefined,
      mobilePhone: cliente.whatsapp ?? cliente.telefone ?? undefined,
      externalReference: cliente.id,
    })
    await supabase
      .from('clientes')
      .update({ asaas_customer_id: noAsaas.id })
      .eq('id', cliente.id)

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${cliente.id}`)
    return { ok: true, id: cliente.id }
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : 'Falha ao espelhar no Asaas.',
    }
  }
}

const esquemaContrato = z.object({
  cliente_id: z.string().uuid('Selecione o cliente.'),
  frente: z.enum(['digital', 'tecnologia', 'visual', 'comunicacao']),
  tipo: z.string().min(1, 'Selecione o tipo.'),
  descricao: z.string().optional(),
  modo: z.enum(['recorrente', 'parcelado', 'avulso']),
  valor: z.string().min(1, 'Informe o valor.'),
  parcelas: z.string().optional(),
  dia_vencimento: z.string().optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  template_id: z.string().uuid().optional().or(z.literal('')),
})

/** Cria o contrato em rascunho. A cobrança só nasce depois da assinatura. */
export async function salvarContrato(_estado: unknown, formData: FormData): Promise<Resultado> {
  const analise = esquemaContrato.safeParse({
    cliente_id: texto(formData, 'cliente_id'),
    frente: texto(formData, 'frente'),
    tipo: texto(formData, 'tipo'),
    descricao: texto(formData, 'descricao'),
    modo: texto(formData, 'modo'),
    valor: texto(formData, 'valor'),
    parcelas: texto(formData, 'parcelas'),
    dia_vencimento: texto(formData, 'dia_vencimento'),
    inicio: texto(formData, 'inicio'),
    fim: texto(formData, 'fim'),
    template_id: texto(formData, 'template_id'),
  })
  if (!analise.success) return { ok: false, erro: analise.error.issues[0].message }

  const d = analise.data
  let valorCentavos: number
  try {
    valorCentavos = parseParaCentavos(d.valor)
  } catch {
    return { ok: false, erro: 'Valor inválido.' }
  }
  if (valorCentavos <= 0) return { ok: false, erro: 'O valor deve ser maior que zero.' }

  const parcelas = d.modo === 'parcelado' ? Number(d.parcelas || 0) : null
  if (d.modo === 'parcelado' && (!parcelas || parcelas < 2)) {
    return { ok: false, erro: 'Parcelamento exige ao menos 2 parcelas.' }
  }

  const diaVencimento = d.dia_vencimento ? Number(d.dia_vencimento) : null
  if (diaVencimento !== null && (diaVencimento < 1 || diaVencimento > 28)) {
    return { ok: false, erro: 'Dia de vencimento deve estar entre 1 e 28.' }
  }
  if (d.modo === 'recorrente' && diaVencimento === null) {
    return { ok: false, erro: 'Contrato recorrente precisa de dia de vencimento.' }
  }

  const supabase = await supabaseServidor()
  const { data: contrato, error } = await supabase
    .from('contratos')
    .insert({
      cliente_id: d.cliente_id,
      frente: d.frente,
      tipo: d.tipo,
      descricao: d.descricao || null,
      modo: d.modo,
      valor_centavos: valorCentavos,
      parcelas,
      dia_vencimento: diaVencimento,
      inicio: d.inicio || null,
      fim: d.fim || null,
      template_id: d.template_id || null,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (error || !contrato) {
    return { ok: false, erro: error?.message ?? 'Falha ao salvar o contrato.' }
  }

  revalidatePath('/contratos')
  return { ok: true, id: contrato.id }
}

/**
 * Fluxo do mockup: Gerado → Enviado. Renderiza o template com as merge tags,
 * guarda o PDF no Storage e abre o documento na ZapSign.
 */
export async function enviarParaAssinatura(contratoId: string): Promise<Resultado> {
  const supabase = await supabaseServidor()

  const { data, error } = await supabase
    .from('contratos')
    .select('*, clientes(*), templates_contrato(*)')
    .eq('id', contratoId)
    .single()

  if (error || !data) return { ok: false, erro: 'Contrato não encontrado.' }

  const contrato = data as unknown as Contrato & {
    clientes: Cliente | null
    templates_contrato: TemplateContrato | null
  }

  if (!contrato.templates_contrato) {
    return { ok: false, erro: 'Contrato sem template. Escolha um modelo em Config.' }
  }
  const cliente = contrato.clientes
  if (!cliente) return { ok: false, erro: 'Contrato sem cliente.' }
  if (!cliente.email && !cliente.whatsapp) {
    return { ok: false, erro: 'Cliente sem e-mail nem WhatsApp para assinar.' }
  }

  const vigencia = [contrato.inicio, contrato.fim].filter(Boolean).join(' a ') || 'indeterminada'
  const corpo = aplicarMergeTags(contrato.templates_contrato.corpo_html, {
    cliente: {
      nome: cliente.nome,
      nome_fantasia: cliente.nome_fantasia ?? cliente.nome,
      documento: cliente.documento ?? '',
      email: cliente.email ?? '',
    },
    contrato: {
      codigo: contrato.codigo,
      tipo: contrato.tipo,
      descricao: contrato.descricao ?? '',
    },
    valor: formatBRL(Number(contrato.valor_centavos)),
    parcelas: contrato.parcelas ?? 1,
    vigencia,
    dia_vencimento: contrato.dia_vencimento ?? '',
  })

  try {
    const pdf = await htmlParaPdf(
      moldurarContrato(corpo, `${contrato.codigo} — ${cliente.nome}`),
    )
    const caminho = `${cliente.id}/${contrato.codigo}.pdf`

    const { error: erroUpload } = await supabase.storage
      .from('contratos')
      .upload(caminho, pdf, { contentType: 'application/pdf', upsert: true })
    if (erroUpload) throw erroUpload

    const doc = await criarDocumento({
      nome: `${contrato.codigo} — ${cliente.nome}`,
      pdfBase64: pdf.toString('base64'),
      signatario: {
        nome: cliente.nome,
        email: cliente.email ?? undefined,
        telefone: cliente.whatsapp ?? undefined,
      },
      urlWebhook: `${env.appUrl()}/api/webhooks/zapsign?t=${env.zapsignWebhookToken()}`,
    })

    await supabase
      .from('contratos')
      .update({
        status: 'enviado',
        pdf_path: caminho,
        zapsign_doc_id: doc.token,
        zapsign_status: doc.status,
      })
      .eq('id', contrato.id)

    revalidatePath('/contratos')
    return { ok: true, id: contrato.id }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao enviar para assinatura.'
    return { ok: false, erro: mensagem }
  }
}

/**
 * Gatilho pós-assinatura: cria a cobrança no Asaas conforme o modo do contrato
 * e deixa o contrato ativo. Idempotente — não recria se já houver assinatura.
 */
export async function ativarCobranca(contratoId: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('contratos')
    .select('*, clientes(*), assinaturas(id)')
    .eq('id', contratoId)
    .single()

  if (error || !data) return { ok: false, erro: 'Contrato não encontrado.' }

  const contrato = data as unknown as Contrato & {
    clientes: Cliente | null
    assinaturas: { id: string }[]
  }
  const cliente = contrato.clientes
  if (!cliente?.asaas_customer_id) {
    return { ok: false, erro: 'Cliente ainda não espelhado no Asaas.' }
  }
  if (contrato.modo === 'recorrente' && contrato.assinaturas.length > 0) {
    return { ok: true, id: contrato.id }
  }

  const vencimento = proximoVencimento(contrato.dia_vencimento ?? 10)
  const descricao = `${contrato.codigo} · ${contrato.tipo}`

  try {
    if (contrato.modo === 'recorrente') {
      const assinatura = await asaas.criarAssinatura({
        customer: cliente.asaas_customer_id,
        valorCentavos: Number(contrato.valor_centavos),
        nextDueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
      await supabase.from('assinaturas').insert({
        contrato_id: contrato.id,
        asaas_subscription_id: assinatura.id,
        ciclo: assinatura.cycle,
        proxima_cobranca: assinatura.nextDueDate,
      })
    } else if (contrato.modo === 'parcelado') {
      await asaas.criarParcelamento({
        customer: cliente.asaas_customer_id,
        totalCentavos: Number(contrato.valor_centavos),
        parcelas: contrato.parcelas ?? 2,
        dueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
    } else {
      await asaas.criarCobranca({
        customer: cliente.asaas_customer_id,
        valorCentavos: Number(contrato.valor_centavos),
        dueDate: vencimento,
        description: descricao,
        externalReference: contrato.id,
      })
    }

    await supabase.from('contratos').update({ status: 'ativo' }).eq('id', contrato.id)
    revalidatePath('/contratos')
    revalidatePath('/cobrancas')
    return { ok: true, id: contrato.id }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Falha ao criar a cobrança.'
    return { ok: false, erro: mensagem }
  }
}

export async function marcarLead(id: string, campo: 'lido' | 'respondido', valor: boolean) {
  const supabase = await supabaseServidor()
  await supabase.from('leads').update({ [campo]: valor }).eq('id', id)
  revalidatePath('/leads')
}

export async function salvarTemplate(_estado: unknown, formData: FormData): Promise<Resultado> {
  const nome = texto(formData, 'nome')
  const corpo = texto(formData, 'corpo_html')
  if (!nome || !corpo) return { ok: false, erro: 'Nome e corpo do template são obrigatórios.' }

  const supabase = await supabaseServidor()
  const { error } = await supabase.from('templates_contrato').insert({
    nome,
    frente: texto(formData, 'frente') || null,
    tipo: texto(formData, 'tipo') || null,
    corpo_html: corpo,
  })
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/config')
  return { ok: true }
}

/** Normaliza o domínio: sem protocolo, sem www, sem barra final. */
function normalizaDominio(entrada: string): string {
  return entrada
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/**
 * Cadastro e edição dos sites dos clientes. A `site_key` usada pelo
 * formulário público é gerada pelo banco e nunca muda depois — trocá-la
 * derrubaria os formulários já instalados.
 */
export async function salvarSite(_estado: unknown, formData: FormData): Promise<Resultado> {
  const dominio = normalizaDominio(texto(formData, 'dominio'))
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) {
    return { ok: false, erro: 'Domínio inválido. Ex.: cliente.com.br' }
  }

  const campos = {
    dominio,
    cliente_id: texto(formData, 'cliente_id') || null,
    host: texto(formData, 'host') || null,
  }

  const supabase = await supabaseServidor()
  const id = texto(formData, 'id')

  const { data, error } = id
    ? await supabase.from('sites').update(campos).eq('id', id).select('id').single()
    : await supabase.from('sites').insert(campos).select('id').single()

  if (error || !data) {
    const duplicado = error?.code === '23505'
    return {
      ok: false,
      erro: duplicado ? 'Esse domínio já está cadastrado.' : (error?.message ?? 'Falha ao salvar o site.'),
    }
  }

  revalidatePath('/config')
  revalidatePath('/dashboard')
  return { ok: true, id: data.id }
}

/**
 * Edição de contrato — permitida só enquanto está em rascunho.
 * Depois de enviado para assinatura, o PDF já saiu da nossa mão: mexer no
 * valor aqui deixaria o Master divergente do documento que o cliente vê.
 */
export async function atualizarContrato(_estado: unknown, formData: FormData): Promise<Resultado> {
  const id = texto(formData, 'id')
  if (!id) return { ok: false, erro: 'Contrato não informado.' }

  const supabase = await supabaseServidor()
  const { data: atual, error: erroBusca } = await supabase
    .from('contratos')
    .select('status')
    .eq('id', id)
    .single()

  if (erroBusca || !atual) return { ok: false, erro: 'Contrato não encontrado.' }
  if (atual.status !== 'rascunho') {
    return {
      ok: false,
      erro: 'Só dá para editar contrato em rascunho. Depois de enviado, cancele e gere outro.',
    }
  }

  const analise = esquemaContrato.safeParse({
    cliente_id: texto(formData, 'cliente_id'),
    frente: texto(formData, 'frente'),
    tipo: texto(formData, 'tipo'),
    descricao: texto(formData, 'descricao'),
    modo: texto(formData, 'modo'),
    valor: texto(formData, 'valor'),
    parcelas: texto(formData, 'parcelas'),
    dia_vencimento: texto(formData, 'dia_vencimento'),
    inicio: texto(formData, 'inicio'),
    fim: texto(formData, 'fim'),
    template_id: texto(formData, 'template_id'),
  })
  if (!analise.success) return { ok: false, erro: analise.error.issues[0].message }

  const d = analise.data
  let valorCentavos: number
  try {
    valorCentavos = parseParaCentavos(d.valor)
  } catch {
    return { ok: false, erro: 'Valor inválido.' }
  }
  if (valorCentavos <= 0) return { ok: false, erro: 'O valor deve ser maior que zero.' }

  const parcelas = d.modo === 'parcelado' ? Number(d.parcelas || 0) : null
  if (d.modo === 'parcelado' && (!parcelas || parcelas < 2)) {
    return { ok: false, erro: 'Parcelamento exige ao menos 2 parcelas.' }
  }

  const diaVencimento = d.dia_vencimento ? Number(d.dia_vencimento) : null
  if (diaVencimento !== null && (diaVencimento < 1 || diaVencimento > 28)) {
    return { ok: false, erro: 'Dia de vencimento deve estar entre 1 e 28.' }
  }
  if (d.modo === 'recorrente' && diaVencimento === null) {
    return { ok: false, erro: 'Contrato recorrente precisa de dia de vencimento.' }
  }

  const { error } = await supabase
    .from('contratos')
    .update({
      cliente_id: d.cliente_id,
      frente: d.frente,
      tipo: d.tipo,
      descricao: d.descricao || null,
      modo: d.modo,
      valor_centavos: valorCentavos,
      parcelas,
      dia_vencimento: diaVencimento,
      inicio: d.inicio || null,
      fim: d.fim || null,
      template_id: d.template_id || null,
    })
    .eq('id', id)

  if (error) return { ok: false, erro: error.message }

  revalidatePath('/contratos')
  return { ok: true, id }
}

// Módulo 1 — Inteligência de mercado -----------------------------------

/**
 * Cria o segmento. Sem cliente_id = modo "segmento" livre (Parte 2,
 * prospecção); com cliente_id = já nasce ligado à ficha do cliente.
 */
export async function criarSegmento(_estado: unknown, formData: FormData): Promise<Resultado> {
  const nome = texto(formData, 'nome')
  if (!nome) return { ok: false, erro: 'Informe o nome do segmento.' }
  const clienteId = texto(formData, 'cliente_id')

  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('segmentos')
    .insert({ nome, cliente_id: clienteId || null })
    .select('id')
    .single()

  if (error || !data) return { ok: false, erro: error?.message ?? 'Falha ao criar o segmento.' }

  revalidatePath('/segmentos')
  return { ok: true, id: data.id }
}

/**
 * Liga um segmento livre a um cliente — "transformar segmento em projeto
 * de cliente" (Parte 16, tela 3). O estudo já feito não é copiado, é o
 * mesmo registro que passa a aparecer na aba Mercado da ficha.
 */
export async function ligarSegmentoAoCliente(segmentoId: string, clienteId: string) {
  const supabase = await supabaseServidor()
  const { error } = await supabase
    .from('segmentos')
    .update({ cliente_id: clienteId })
    .eq('id', segmentoId)
  if (error) return { ok: false, erro: error.message } as Resultado
  revalidatePath('/segmentos')
  revalidatePath(`/segmentos/${segmentoId}`)
  return { ok: true } as Resultado
}

/**
 * Expande o segmento em palavras vizinhas via IA (Parte 6.1 caminho A) e
 * grava as que ainda não existiam. Idempotente por (segmento_id, termo).
 */
export async function expandirPalavras(segmentoId: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { data: segmento, error: erroSegmento } = await supabase
    .from('segmentos')
    .select('nome')
    .eq('id', segmentoId)
    .single()
  if (erroSegmento || !segmento) return { ok: false, erro: 'Segmento não encontrado.' }

  try {
    const termos = await expandirSegmento(segmento.nome)
    if (termos.length === 0) return { ok: false, erro: 'A IA não retornou termos.' }

    const { error } = await supabase
      .from('palavras_chave')
      .upsert(
        termos.map((termo) => ({ segmento_id: segmentoId, termo })),
        { onConflict: 'segmento_id,termo', ignoreDuplicates: true },
      )
    if (error) return { ok: false, erro: error.message }

    revalidatePath(`/segmentos/${segmentoId}`)
    return { ok: true, id: segmentoId }
  } catch (erro) {
    if (erro instanceof ErroIA) return { ok: false, erro: erro.message }
    return { ok: false, erro: 'Falha ao expandir o segmento.' }
  }
}

/** Marca/desmarca uma palavra como interessante (Parte 16, tela 3). */
export async function marcarInteressante(palavraId: string, valor: boolean) {
  const supabase = await supabaseServidor()
  await supabase.from('palavras_chave').update({ interessante: valor }).eq('id', palavraId)
}

/**
 * Checa a disponibilidade de domínio de uma palavra nas extensões padrão
 * via RDAP (sem chave, sem aprovação — Parte 3.7/3.12). Chamada sob
 * demanda pelo usuário, não em lote automático, para não estressar o
 * serviço público.
 */
export async function checarDominiosDaPalavra(palavraId: string, termo: string) {
  const supabase = await supabaseServidor()

  const resultados = await Promise.all(
    EXTENSOES_PADRAO.map(async (extensao) => {
      const resultado = await checarDominio(termo, extensao)
      return {
        palavra_id: palavraId,
        extensao,
        disponivel: resultado === 'indeterminado' ? null : resultado === 'disponivel',
        checado_em: new Date().toISOString(),
      }
    }),
  )

  await supabase
    .from('checagens_dominio')
    .upsert(resultados, { onConflict: 'palavra_id,extensao' })

  revalidatePath(`/segmentos`)
}

// Módulo CRM ---------------------------------------------------------

/**
 * Registra a resposta do agente na conversa.
 *
 * A mensagem nasce `pending` de propósito: entregar de fato depende de um
 * adaptador de canal (WhatsApp/Instagram/…), que ainda não existe — ver
 * docs/crm/arquitetura.md. Quando o adaptador entrar, é ele quem muda o
 * status para `sent`/`delivered` e preenche o `external_message_id`. Até
 * lá a tela diz isso na cara do usuário, em vez de fingir que enviou.
 */
export async function responderConversa(
  conversaId: string,
  corpo: string,
): Promise<Resultado> {
  const texto = corpo.trim()
  if (!texto) return { ok: false, erro: 'Escreva a mensagem antes de enviar.' }

  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, workspace_id')
    .eq('id', conversaId)
    .single()

  if (!conversa) return { ok: false, erro: 'Conversa não encontrada.' }

  const agora = new Date().toISOString()
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversa.id,
    workspace_id: conversa.workspace_id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: user?.id ?? null,
    body: texto,
    status: 'pending',
  })

  if (error) return { ok: false, erro: error.message }

  await supabase
    .from('conversations')
    .update({ last_message_at: agora })
    .eq('id', conversa.id)

  revalidatePath(`/crm/inbox/${conversaId}`)
  revalidatePath('/crm/inbox')
  return { ok: true }
}

/** Ativo / pendente / encerrado — cabeçalho da thread (docs/crm/ui.md). */
export async function mudarStatusConversa(
  conversaId: string,
  status: 'open' | 'pending' | 'closed',
): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversaId)

  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/crm/inbox/${conversaId}`)
  revalidatePath('/crm/inbox')
  return { ok: true }
}

/** Move a conversa de estágio no funil (a coluna do /crm/funil). */
export async function moverConversaDeEstagio(
  conversaId: string,
  estagioId: string | null,
): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { error } = await supabase
    .from('conversations')
    .update({ pipeline_stage_id: estagioId })
    .eq('id', conversaId)

  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/crm/inbox/${conversaId}`)
  revalidatePath('/crm/funil')
  return { ok: true }
}

/** Assume o atendimento (ou devolve para a fila, com `assumir: false`). */
export async function assumirConversa(
  conversaId: string,
  assumir: boolean,
): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (assumir && !user) return { ok: false, erro: 'Sessão expirada.' }

  const { error } = await supabase
    .from('conversations')
    .update({ assigned_to: assumir ? user!.id : null })
    .eq('id', conversaId)

  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/crm/inbox/${conversaId}`)
  revalidatePath('/crm/inbox')
  return { ok: true }
}

// Módulo 2 — Radar de domínios ---------------------------------------

/**
 * Põe um domínio no radar e já faz a primeira consulta, para a linha
 * nascer com estado de verdade em vez de "indeterminado".
 */
export async function adicionarAoRadar(
  _estado: unknown,
  formData: FormData,
): Promise<Resultado> {
  const bruto = texto(formData, 'dominio').toLowerCase().replace(/^https?:\/\//, '')
  const dominio = bruto.replace(/\/.*$/, '').trim()

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dominio)) {
    return { ok: false, erro: 'Informe um domínio completo, com extensão (ex.: haya.com.br).' }
  }

  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('dominios_radar')
    .insert({
      dominio,
      motivo: texto(formData, 'motivo') || null,
      cliente_id: texto(formData, 'cliente_id') || null,
    })
    .select('id, dominio, estado')
    .single()

  if (error) {
    return {
      ok: false,
      erro: error.code === '23505' ? 'Esse domínio já está no radar.' : error.message,
    }
  }

  await reconsultarRadar(supabase, [data as DominioRadar])
  revalidatePath('/dominios')
  return { ok: true, id: data.id }
}

/** Vigiar um domínio que saiu da checagem de uma palavra do segmento. */
export async function vigiarDominioDaPalavra(
  palavraId: string,
  dominio: string,
): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { data, error } = await supabase
    .from('dominios_radar')
    .insert({ dominio, palavra_id: palavraId, motivo: 'Veio da pesquisa de segmento' })
    .select('id, dominio, estado')
    .single()

  if (error) {
    return {
      ok: false,
      erro: error.code === '23505' ? 'Esse domínio já está no radar.' : error.message,
    }
  }

  await reconsultarRadar(supabase, [data as DominioRadar])
  revalidatePath('/dominios')
  return { ok: true, id: data.id }
}

/** Liga/desliga o acompanhamento sem perder o histórico do domínio. */
export async function alternarRadar(dominioId: string, ativo: boolean) {
  const supabase = await supabaseServidor()
  await supabase.from('dominios_radar').update({ ativo }).eq('id', dominioId)
  revalidatePath('/dominios')
}

/** "Checar agora" — mesma rotina do cron, disparada à mão. */
export async function checarRadarAgora(dominioId?: string): Promise<Resultado> {
  const supabase = await supabaseServidor()

  let consulta = supabase.from('dominios_radar').select('id, dominio, estado').eq('ativo', true)
  if (dominioId) consulta = consulta.eq('id', dominioId)

  const { data, error } = await consulta
  if (error) return { ok: false, erro: error.message }

  await reconsultarRadar(supabase, (data ?? []) as DominioRadar[])
  revalidatePath('/dominios')
  return { ok: true }
}

// Central de alertas ------------------------------------------------

/**
 * Baixa um alerta. O problema de origem continua no banco: o que gravamos
 * é só a chave determinística, para o item sumir da central e do dashboard.
 */
export async function resolverAlerta(chave: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('alertas_resolvidos')
    .upsert({ chave, resolvido_por: user?.id ?? null }, { onConflict: 'chave' })

  if (error) return { ok: false, erro: error.message }

  revalidatePath('/alertas')
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Reabre um alerta baixado por engano. */
export async function reabrirAlerta(chave: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const { error } = await supabase.from('alertas_resolvidos').delete().eq('chave', chave)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/alertas')
  revalidatePath('/dashboard')
  return { ok: true }
}

/** Baixa em lote — botão "Resolver todos" do topo da central. */
export async function resolverAlertas(chaves: string[]): Promise<Resultado> {
  if (chaves.length === 0) return { ok: true }

  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('alertas_resolvidos')
    .upsert(
      chaves.map((chave) => ({ chave, resolvido_por: user?.id ?? null })),
      { onConflict: 'chave' },
    )

  if (error) return { ok: false, erro: error.message }

  revalidatePath('/alertas')
  revalidatePath('/dashboard')
  return { ok: true }
}

// Usuários e permissões ---------------------------------------------

const PAPEIS = ['admin', 'operador'] as const

/**
 * Muda o perfil de alguém da equipe. A RLS já barra quem não é admin
 * (usuarios_master_admin_atualiza) — a checagem aqui é só para devolver
 * uma mensagem em vez de um erro cru do Postgres.
 */
export async function mudarPapel(id: string, papel: string): Promise<Resultado> {
  if (!PAPEIS.includes(papel as (typeof PAPEIS)[number])) {
    return { ok: false, erro: 'Perfil inválido.' }
  }

  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === id) {
    return { ok: false, erro: 'Você não pode mudar o próprio perfil.' }
  }

  const { error } = await supabase.from('usuarios_master').update({ papel }).eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

/** Tira alguém da equipe do Master. A conta no auth continua existindo. */
export async function removerDaEquipe(id: string): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id === id) {
    return { ok: false, erro: 'Você não pode remover o próprio acesso.' }
  }

  const { error } = await supabase.from('usuarios_master').delete().eq('id', id)
  if (error) return { ok: false, erro: error.message }

  revalidatePath('/usuarios')
  return { ok: true }
}

// Relatório mensal --------------------------------------------------

/**
 * Enfileira o resumo do mês como mensagem de saída na conversa de WhatsApp
 * do cliente. O envio em si é do adaptador (services/whatsapp-adapter), que
 * consome `messages` com status `pending` — o mesmo caminho da resposta
 * manual no inbox.
 */
export async function enviarRelatorioPorWhatsApp(
  clienteId: string,
  resumo: string,
): Promise<Resultado> {
  const supabase = await supabaseServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('whatsapp, telefone')
    .eq('id', clienteId)
    .maybeSingle()

  const numero = somenteDigitos(cliente?.whatsapp || cliente?.telefone || '')
  if (!numero) {
    return { ok: false, erro: 'O cliente não tem WhatsApp nem telefone cadastrado.' }
  }

  const { data: contato } = await supabase
    .from('contacts')
    .select('id')
    .eq('phone', numero)
    .limit(1)
    .maybeSingle()

  if (!contato) {
    return {
      ok: false,
      erro: 'Nenhum contato de WhatsApp com esse número no CRM. Abra uma conversa primeiro.',
    }
  }

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, workspace_id')
    .eq('contact_id', contato.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (!conversa) {
    return { ok: false, erro: 'O contato existe, mas não há conversa aberta com ele.' }
  }

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversa.id,
    workspace_id: conversa.workspace_id,
    direction: 'outbound',
    sender_type: 'agent',
    sender_id: user?.id ?? null,
    body: resumo,
    status: 'pending',
  })

  if (error) return { ok: false, erro: error.message }

  revalidatePath(`/crm/inbox/${conversa.id}`)
  return { ok: true }
}

// Onboarding de cliente ---------------------------------------------

const esquemaOnboarding = z.object({
  nome: z.string().min(2, 'Informe o nome ou razão social.'),
  nome_fantasia: z.string().optional(),
  documento: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  segmento: z.string().optional(),
  palavras: z.string().optional(),
  frente: z.enum(['digital', 'tecnologia', 'visual', 'comunicacao']),
  tipo: z.string().min(1, 'Escolha o tipo de contrato.'),
  modo: z.enum(['recorrente', 'parcelado', 'avulso']),
  valor: z.string().optional(),
  dia_vencimento: z.string().optional(),
  dominio: z.string().optional(),
})

/**
 * Wizard de 5 passos (README §13). Cria o cliente e, quando os campos
 * opcionais vierem preenchidos, o segmento com as palavras, o contrato em
 * rascunho e o domínio no radar. Cada etapa extra falha em silêncio no
 * agregado: o cliente já está criado e o resto é editável na ficha — o
 * onboarding nunca deve travar por causa de um acessório.
 */
export async function ativarCliente(
  _estado: unknown,
  formData: FormData,
): Promise<Resultado> {
  const analise = esquemaOnboarding.safeParse({
    nome: texto(formData, 'nome'),
    nome_fantasia: texto(formData, 'nome_fantasia'),
    documento: texto(formData, 'documento'),
    email: texto(formData, 'email'),
    telefone: texto(formData, 'telefone'),
    whatsapp: texto(formData, 'whatsapp'),
    segmento: texto(formData, 'segmento'),
    palavras: texto(formData, 'palavras'),
    frente: texto(formData, 'frente') || 'digital',
    tipo: texto(formData, 'tipo'),
    modo: texto(formData, 'modo') || 'recorrente',
    valor: texto(formData, 'valor'),
    dia_vencimento: texto(formData, 'dia_vencimento'),
    dominio: texto(formData, 'dominio'),
  })

  if (!analise.success) {
    return { ok: false, erro: analise.error.issues[0].message }
  }

  const d = analise.data
  const documento = d.documento ? somenteDigitos(d.documento) : ''
  if (documento && !validaDocumento(documento)) {
    return { ok: false, erro: 'CPF/CNPJ inválido.' }
  }

  const supabase = await supabaseServidor()

  const { data: cliente, error: erroCliente } = await supabase
    .from('clientes')
    .insert({
      nome: d.nome,
      nome_fantasia: d.nome_fantasia || null,
      documento: documento || null,
      email: d.email || null,
      telefone: d.telefone || null,
      whatsapp: d.whatsapp || null,
    })
    .select('id')
    .single()

  if (erroCliente || !cliente) {
    return { ok: false, erro: erroCliente?.message ?? 'Não foi possível criar o cliente.' }
  }

  // Segmento e palavras-chave (passo 2).
  if (d.segmento) {
    const { data: segmento } = await supabase
      .from('segmentos')
      .insert({ nome: d.segmento, cliente_id: cliente.id })
      .select('id')
      .single()

    const termos = (d.palavras ?? '')
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (segmento && termos.length > 0) {
      await supabase
        .from('palavras_chave')
        .insert(termos.map((termo) => ({ segmento_id: segmento.id, termo })))
    }
  }

  // Contrato em rascunho (passo 3) — nunca ativado direto: assinatura e
  // cobrança continuam sendo decisões explícitas na tela de contratos.
  const centavos = d.valor ? parseParaCentavos(d.valor) : 0
  if (centavos > 0) {
    await supabase.from('contratos').insert({
      cliente_id: cliente.id,
      frente: d.frente,
      tipo: d.tipo,
      modo: d.modo,
      valor_centavos: centavos,
      dia_vencimento: d.dia_vencimento ? Number(d.dia_vencimento) : null,
      status: 'rascunho',
    })
  }

  // Domínio no radar (passo 4).
  const dominio = d.dominio?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (dominio) {
    await supabase.from('dominios_radar').insert({
      dominio,
      cliente_id: cliente.id,
      motivo: 'cadastrado no onboarding',
      estado: 'indeterminado',
    })
  }

  revalidatePath('/clientes')
  revalidatePath('/dashboard')
  return { ok: true, id: cliente.id }
}
