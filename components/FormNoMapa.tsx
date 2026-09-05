'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { criarNoMapa, type Resultado } from '@/lib/acoes'
import type { TipoNoMapa } from '@/lib/db'
import { ROTULO_TIPO_NO } from '@/lib/db'
import { Botao, Campo, Entrada, Selecao } from './Campo'
import { Modal } from './Modal'

const TIPOS: TipoNoMapa[] = [
  'hub',
  'subdominio',
  'landing',
  'satelite',
  'canibalizacao',
  'buraco',
]

const AJUDA: Record<TipoNoMapa, string> = {
  hub: 'O domínio principal da marca. Só pode haver um.',
  subdominio: 'Subdomínio da marca (ex.: blog.marca.com.br).',
  landing: 'Página de campanha, própria ou em domínio separado.',
  satelite: 'Outra marca do grupo que disputa o mesmo mercado.',
  canibalizacao: 'Duas páginas suas brigando pela mesma palavra.',
  buraco: 'Palavra relevante que nenhuma página cobre ainda.',
}

export function FormNoMapa({ clienteId }: { clienteId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoNoMapa>('subdominio')
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    criarNoMapa,
    null,
  )

  useEffect(() => {
    if (estado?.ok) {
      setAberto(false)
      router.refresh()
    }
  }, [estado, router])

  return (
    <>
      <Botao variante="primario" onClick={() => setAberto(true)}>
        + Nó no mapa
      </Botao>

      {aberto && (
        <Modal titulo="Novo nó no mapa" aoFechar={() => setAberto(false)}>
          <form action={acao} className="space-y-3.5">
            <input type="hidden" name="cliente_id" value={clienteId} />

            <Campo rotulo="Tipo" dica={AJUDA[tipo]}>
              <Selecao
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoNoMapa)}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO_NO[t]}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Rótulo" dica="Como aparece no mapa — curto.">
              <Entrada name="rotulo" required placeholder="ex.: blog.marca.com.br" />
            </Campo>

            <Campo rotulo="Palavra alvo (opcional)">
              <Entrada name="palavra_alvo" placeholder="ex.: fachada em acm" />
            </Campo>

            <Campo rotulo="URL (opcional)">
              <Entrada name="url" placeholder="https://" />
            </Campo>

            {estado && !estado.ok && (
              <p className="text-[11.5px] text-magenta-claro">! {estado.erro}</p>
            )}

            <div className="flex gap-2.5">
              <Botao type="submit" disabled={pendente}>
                {pendente ? 'Salvando…' : 'Acrescentar'}
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
