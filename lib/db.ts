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

export const ROTULO_MODO: Record<ModoCobranca, string> = {
  recorrente: 'Recorrente',
  parcelado: 'Parcelado',
  avulso: 'Avulso',
}

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

// Módulo 1 — Inteligência de mercado ---------------------------------

export type TendenciaPalavra = 'subindo' | 'estavel' | 'caindo'

export type Segmento = {
  id: string
  nome: string
  cliente_id: string | null
  criado_em: string
}

export type PalavraChave = {
  id: string
  segmento_id: string
  termo: string
  tendencia: TendenciaPalavra | null
  volume: number | null
  interessante: boolean
  criado_em: string
}

export type ChecagemDominio = {
  id: number
  palavra_id: string
  extensao: string
  disponivel: boolean | null
  checado_em: string | null
}

export const ROTULO_TENDENCIA: Record<TendenciaPalavra, string> = {
  subindo: '▲ Subindo',
  estavel: '● Estável',
  caindo: '▼ Caindo',
}

// Módulo CRM — modelo único de conversa (veio do app "omnicrm") ------

export type CanalCrm =
  | 'whatsapp_qr'
  | 'whatsapp_cloud'
  | 'instagram'
  | 'facebook'
  | 'mercado_livre'

export type StatusConversa = 'open' | 'pending' | 'closed'
export type DirecaoMensagem = 'inbound' | 'outbound'
export type RemetenteMensagem = 'contact' | 'agent' | 'system'
export type StatusMensagem = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type ContatoCrm = {
  id: string
  workspace_id: string
  channel: CanalCrm
  external_id: string
  name: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
}

export type EstagioFunil = {
  id: string
  workspace_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
}

export type ConversaCrm = {
  id: string
  ticket_number: number
  workspace_id: string
  contact_id: string
  channel_account_id: string
  status: StatusConversa
  assigned_to: string | null
  pipeline_stage_id: string | null
  last_message_at: string | null
  window_expires_at: string | null
  created_at: string
  updated_at: string
}

export type MensagemCrm = {
  id: string
  conversation_id: string
  workspace_id: string
  direction: DirecaoMensagem
  sender_type: RemetenteMensagem
  sender_id: string | null
  body: string | null
  media_url: string | null
  external_message_id: string | null
  status: StatusMensagem
  created_at: string
}

export const ROTULO_STATUS_CONVERSA: Record<StatusConversa, string> = {
  open: 'Ativo',
  pending: 'Pendente',
  closed: 'Encerrado',
}

/** Ícone de entrega, no padrão que a doc de UI descreve (docs/crm/ui.md). */
export const ROTULO_STATUS_MENSAGEM: Record<StatusMensagem, string> = {
  pending: '◷ na fila',
  sent: '✓ enviada',
  delivered: '✓✓ entregue',
  read: '✓✓ lida',
  failed: '! falhou',
}

// Módulo 2 — Radar de domínios ---------------------------------------

export type EstadoDominio = 'livre' | 'registrado' | 'indeterminado'

export type DominioRadar = {
  id: string
  dominio: string
  motivo: string | null
  cliente_id: string | null
  palavra_id: string | null
  estado: EstadoDominio
  expira_em: string | null
  registrado_em: string | null
  registrador: string | null
  checado_em: string | null
  ativo: boolean
  criado_em: string
}

export type EventoDominio = {
  id: number
  dominio_id: string
  de: EstadoDominio | null
  para: EstadoDominio
  em: string
}

export const ROTULO_ESTADO_DOMINIO: Record<EstadoDominio, string> = {
  livre: '✓ Livre',
  registrado: '● Registrado',
  indeterminado: '? Sem resposta',
}

// Conteúdo gerado e calendário de publicação (Intelligence §5 e §7) -----

export type CanalConteudo = 'instagram' | 'facebook' | 'tiktok' | 'blog' | 'youtube'
export type StatusConteudo = 'rascunho' | 'aguardando' | 'aprovado' | 'publicado'

export type Conteudo = {
  id: string
  cliente_id: string | null
  canal: CanalConteudo
  titulo: string
  trecho: string | null
  corpo: string | null
  status: StatusConteudo
  publicar_em: string | null
  publicado_em: string | null
  modelo: string | null
  custo_centesimos_usd: number
  criado_em: string
  aprovado_em: string | null
  aprovado_por: string | null
}

export const CANAIS_CONTEUDO: CanalConteudo[] = [
  'instagram',
  'facebook',
  'tiktok',
  'blog',
  'youtube',
]

export const ROTULO_CANAL_CONTEUDO: Record<CanalConteudo, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  blog: 'Blog',
  youtube: 'YouTube',
}

export const ROTULO_STATUS_CONTEUDO: Record<StatusConteudo, string> = {
  rascunho: 'rascunho',
  aguardando: 'aguardando',
  aprovado: 'aprovado',
  publicado: 'publicado',
}

// Mapa de posicionamento (Intelligence §4) ------------------------------

export type TipoNoMapa =
  | 'hub'
  | 'subdominio'
  | 'landing'
  | 'satelite'
  | 'canibalizacao'
  | 'buraco'

export type NoMapa = {
  id: string
  cliente_id: string
  tipo: TipoNoMapa
  rotulo: string
  palavra_alvo: string | null
  escopo: string | null
  url: string | null
  telefone: string | null
  trafego_mes: number | null
  leads_30d: number | null
  x: number
  y: number
  criado_em: string
}

export type ArestaMapa = {
  id: number
  de: string
  para: string
  canibalizacao: boolean
}

export const ROTULO_TIPO_NO: Record<TipoNoMapa, string> = {
  hub: 'Hub da marca',
  subdominio: 'Subdomínio',
  landing: 'Landing',
  satelite: 'Marca satélite',
  canibalizacao: 'Canibalização',
  buraco: 'Buraco de cobertura',
}
