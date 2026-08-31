import { Painel, Vazio } from '@/components/Painel'
import { Celula, Linha, Tabela } from '@/components/Tabela'
import { CRM_WORKSPACE_ID, ROTULO_CANAL } from '@/lib/crm'
import { supabaseServidor } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function ContatosPage() {
  const supabase = await supabaseServidor()

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, name, phone, channel, external_id, created_at')
    .eq('workspace_id', CRM_WORKSPACE_ID)
    .order('created_at', { ascending: false })

  return (
    <Painel titulo={`Contatos${contatos?.length ? ` · ${contatos.length}` : ''}`}>
      {!contatos?.length ? (
        <Vazio>
          Nenhum contato ainda — criados automaticamente pelo primeiro
          contato em cada canal.
        </Vazio>
      ) : (
        <Tabela cabecalho={['Nome', 'Canal', 'Identificador', 'Telefone']}>
          {contatos.map((c) => (
            <Linha key={c.id}>
              <Celula>{c.name ?? '—'}</Celula>
              <Celula>{ROTULO_CANAL[c.channel] ?? c.channel}</Celula>
              <Celula>
                <span className="font-mono text-xs">{c.external_id}</span>
              </Celula>
              <Celula>{c.phone ?? '—'}</Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Painel>
  )
}
