/**
 * Workspace único do módulo CRM (semeado na 0001_init.sql do antigo
 * "omnicrm"). Acesso a essas tabelas já é liberado pra todo membro do
 * Master via public.is_master() na policy — não precisa resolver
 * workspace_id por usuário. Quando (se) o CRM virar multi-tenant de
 * verdade, isso passa a vir de uma escolha do usuário, não de uma
 * constante.
 */
export const CRM_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001'

export const ROTULO_CANAL: Record<string, string> = {
  whatsapp_qr: 'WhatsApp',
  whatsapp_cloud: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  mercado_livre: 'Mercado Livre',
}
