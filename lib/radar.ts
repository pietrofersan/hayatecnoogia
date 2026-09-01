import type { SupabaseClient } from '@supabase/supabase-js'
import type { DominioRadar, EstadoDominio } from './db'
import { consultarDominio, type ResultadoRdap } from './rdap'

/** RDAP fala 'disponivel'; no radar o estado se chama 'livre'. */
const ESTADO: Record<ResultadoRdap, EstadoDominio> = {
  disponivel: 'livre',
  registrado: 'registrado',
  indeterminado: 'indeterminado',
}

export type MudancaRadar = {
  dominio: string
  de: EstadoDominio
  para: EstadoDominio
}

/**
 * Reconsulta os domínios do radar e grava o resultado. Devolve só as
 * mudanças de estado — é o que vira histórico e aviso interno; "continua
 * registrado" pelo 40º dia seguido não é notícia.
 *
 * Serve tanto ao botão "checar agora" quanto ao cron diário, por isso
 * recebe o cliente Supabase de fora (sessão do usuário num caso, service
 * role no outro).
 */
export async function reconsultarRadar(
  supabase: SupabaseClient,
  dominios: Pick<DominioRadar, 'id' | 'dominio' | 'estado'>[],
): Promise<MudancaRadar[]> {
  const mudancas: MudancaRadar[] = []

  for (const alvo of dominios) {
    const consulta = await consultarDominio(alvo.dominio)
    const estado = ESTADO[consulta.estado]

    await supabase
      .from('dominios_radar')
      .update({
        estado,
        expira_em: consulta.expiraEm,
        registrado_em: consulta.registradoEm,
        registrador: consulta.registrador,
        checado_em: new Date().toISOString(),
      })
      .eq('id', alvo.id)

    if (estado !== alvo.estado) {
      await supabase
        .from('eventos_dominio')
        .insert({ dominio_id: alvo.id, de: alvo.estado, para: estado })
      mudancas.push({ dominio: alvo.dominio, de: alvo.estado, para: estado })
    }
  }

  return mudancas
}

/** Dias até a expiração — negativo quando já passou. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5)
}
