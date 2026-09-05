import { Avatar } from '@/components/Avatar'
import { Painel, Vazio } from '@/components/Painel'
import { StatusBadge, type TomBadge } from '@/components/StatusBadge'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { CRM_WORKSPACE_ID, ROTULO_CANAL } from '@/lib/crm'
import type { CanalCrm } from '@/lib/db'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** Cada canal tem cor própria — a mesma da rede (README §15 · Contatos). */
const TOM_CANAL: Record<string, TomBadge> = {
  whatsapp_qr: 'verde',
  whatsapp_cloud: 'verde',
  instagram: 'magenta',
  facebook: 'azul',
  mercado_livre: 'ambar',
}

export default async function ContatosPage() {
  const supabase = await supabaseServidor()

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, name, phone, channel, external_id, created_at')
    .eq('workspace_id', CRM_WORKSPACE_ID)
    .order('created_at', { ascending: false })

  const lista = (contatos ?? []) as {
    id: string
    name: string | null
    phone: string | null
    channel: CanalCrm
    external_id: string
    created_at: string
  }[]

  return (
    <Painel
      titulo="Contatos"
      acao={
        <span className="font-mono text-[10.5px] text-fantasma">
          {lista.length} contato(s)
        </span>
      }
    >
      {lista.length === 0 ? (
        <Vazio descricao="São criados automaticamente no primeiro contato em cada canal.">
          Nenhum contato ainda
        </Vazio>
      ) : (
        <Tabela
          cabecalho={['Nome', 'Canal', 'Identificador', 'Telefone', 'Primeiro contato']}
          minima="48rem"
        >
          {lista.map((c) => (
            <Linha key={c.id}>
              <Celula>
                <span className="flex items-center gap-2.5">
                  <Avatar nome={c.name ?? c.external_id} tamanho={30} />
                  <span className="truncate text-pleno">{c.name ?? 'Sem nome'}</span>
                </span>
              </Celula>
              <Celula>
                <StatusBadge tom={TOM_CANAL[c.channel] ?? 'neutro'}>
                  {ROTULO_CANAL[c.channel] ?? c.channel}
                </StatusBadge>
              </Celula>
              <Celula mono>{c.external_id}</Celula>
              <Celula mono>{c.phone ?? '—'}</Celula>
              <Celula mono>
                {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Painel>
  )
}
