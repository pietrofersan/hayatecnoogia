import { BufferJSON, initAuthCreds, proto } from 'baileys'
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from 'baileys'
import { supabase } from './supabase.js'

/**
 * Equivalente ao useMultiFileAuthState oficial do Baileys, mas gravando no
 * Postgres (tabela whatsapp_sessoes) em vez de arquivo em disco — o Render
 * pode recriar a máquina a qualquer redeploy, e sem isso cada deploy
 * pediria escanear o QR de novo. Mesma convenção de chave do original
 * (`${tipo}-${id}`), só troca onde persiste.
 */

async function lerChave<T>(canalId: string, chave: string): Promise<T | null> {
  const { data } = await supabase
    .from('whatsapp_sessoes')
    .select('valor')
    .eq('canal_id', canalId)
    .eq('chave', chave)
    .maybeSingle()

  if (!data) return null
  return JSON.parse(JSON.stringify(data.valor), BufferJSON.reviver) as T
}

async function gravarChave(canalId: string, chave: string, valor: unknown): Promise<void> {
  const serializado = JSON.parse(JSON.stringify(valor, BufferJSON.replacer))
  await supabase
    .from('whatsapp_sessoes')
    .upsert(
      { canal_id: canalId, chave, valor: serializado, atualizado_em: new Date().toISOString() },
      { onConflict: 'canal_id,chave' },
    )
}

async function apagarChave(canalId: string, chave: string): Promise<void> {
  await supabase.from('whatsapp_sessoes').delete().eq('canal_id', canalId).eq('chave', chave)
}

export async function usarAuthStateSupabase(canalId: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  const creds = (await lerChave<AuthenticationCreds>(canalId, 'creds')) ?? initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const dados: { [id: string]: SignalDataTypeMap[typeof type] } = {}
          await Promise.all(
            ids.map(async (id) => {
              let valor = await lerChave<SignalDataTypeMap[typeof type]>(canalId, `${type}-${id}`)
              if (type === 'app-state-sync-key' && valor) {
                valor = proto.Message.AppStateSyncKeyData.fromObject(
                  valor as Record<string, unknown>,
                ) as never
              }
              if (valor) dados[id] = valor
            }),
          )
          return dados
        },
        set: async (dados) => {
          const tarefas: Promise<void>[] = []
          for (const categoria in dados) {
            const grupo = dados[categoria as keyof typeof dados]
            for (const id in grupo) {
              const valor = grupo[id as keyof typeof grupo]
              const chave = `${categoria}-${id}`
              tarefas.push(valor ? gravarChave(canalId, chave, valor) : apagarChave(canalId, chave))
            }
          }
          await Promise.all(tarefas)
        },
      },
    },
    saveCreds: () => gravarChave(canalId, 'creds', creds),
  }
}

/** Chamado no logout (DisconnectReason.loggedOut) — some a sessão inteira. */
export async function apagarSessao(canalId: string): Promise<void> {
  await supabase.from('whatsapp_sessoes').delete().eq('canal_id', canalId)
}
