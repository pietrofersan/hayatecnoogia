/**
 * Tipos do schema (supabase/migrations/0001_init.sql).
 * Quando o projeto Supabase existir, regerar com:
 *   supabase gen types typescript --project-id <id> > lib/database.types.ts
 */

export type Frente = 'digital' | 'tecnologia' | 'visual' | 'comunicacao'
export type ModoCobranca = 'recorrente' | 'parcelado' | 'avulso'
export type StatusContrato =
  | 'rascunho'
  | 'enviado'
  | 'assinado'
  | 'ativo'
  | 'suspenso'
  | 'encerrado'
export type StatusCobranca =
  | 'pendente'
  | 'paga'
  | 'vencida'
  | 'cancelada'
  | 'estornada'

export type Cliente = {
  id: string
  nome: string
  nome_fantasia: string | null
  documento: string | null
  email: string | null
  telefone: string | null
  whatsapp: string | null
  asaas_customer_id: string | null
  observacoes: string | null
  criado_em: string
}

export type TemplateContrato = {
  id: string
  nome: string
  frente: Frente | null
  tipo: string | null
  corpo_html: string
  ativo: boolean
  criado_em: string
}

export type Contrato = {
  id: string
  seq: number
  codigo: string
  cliente_id: string
  frente: Frente
  tipo: string
  descricao: string | null
  modo: ModoCobranca
  valor_centavos: number
  parcelas: number | null
  dia_vencimento: number | null
  indice_reajuste: string | null
  inicio: string | null
  fim: string | null
  status: StatusContrato
  template_id: string | null
  zapsign_doc_id: string | null
  zapsign_status: string | null
  pdf_path: string | null
  criado_em: string
}

export type Assinatura = {
  id: string
  contrato_id: string
  asaas_subscription_id: string | null
  ciclo: string
  proxima_cobranca: string | null
  ativa: boolean
  criado_em: string
}

export type Cobranca = {
  id: string
  contrato_id: string
  assinatura_id: string | null
  asaas_payment_id: string | null
  valor_centavos: number
  vencimento: string
  pago_em: string | null
  forma: string | null
  status: StatusCobranca
  url_fatura: string | null
  parcela: number | null
  total_parcelas: number | null
  criado_em: string
}

export type Site = {
  id: string
  cliente_id: string | null
  dominio: string
  site_key: string
  host: string | null
  ssl_expira: string | null
  dominio_expira: string | null
  uptime_ok: boolean | null
  checado_em: string | null
  criado_em: string
}

export type Lead = {
  id: string
  cliente_id: string | null
  site_id: string | null
  site: string | null
  nome: string | null
  email: string | null
  telefone: string | null
  mensagem: string | null
  origem: Record<string, unknown> | null
  consentimento: boolean
  criado_em: string
  lido: boolean
  respondido: boolean
}

export type WebhookLog = {
  id: number
  origem: 'asaas' | 'zapsign' | 'leadform'
  evento: string | null
  payload: unknown
  processado: boolean
  erro: string | null
  recebido_em: string
}

export type UsuarioMaster = {
  id: string
  nome: string | null
  papel: 'admin' | 'operador'
  criado_em: string
}

export const FRENTES: Frente[] = ['digital', 'tecnologia', 'visual', 'comunicacao']

export const ROTULO_FRENTE: Record<Frente, string> = {
  digital: 'Digital',
  tecnologia: 'Tecnologia',
  visual: 'Visual',
  comunicacao: 'Comunicação',
}

/** Catálogo extensível de tipos de contrato (seção 2 do blueprint). */
export const TIPOS_CONTRATO = [
  'website',
  'hospedagem',
  'marketing_mensal',
  'trafego',
  'dev_sistema',
  'manutencao',
  'sinalizacao',
  'projeto_pontual',
] as const

export const ROTULO_TIPO: Record<string, string> = {
  website: 'Website',
  hospedagem: 'Hospedagem',
  marketing_mensal: 'Marketing mensal',
  trafego: 'Tráfego pago',
  dev_sistema: 'Desenvolvimento',
  manutencao: 'Manutenção',
  sinalizacao: 'Sinalização',
  projeto_pontual: 'Projeto pontual',
}
