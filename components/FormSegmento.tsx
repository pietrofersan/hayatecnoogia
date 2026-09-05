'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { criarSegmento, type Resultado } from '@/lib/acoes'
import type { Cliente } from '@/lib/db'
import { Botao, Campo, Entrada, Selecao } from './Campo'
import { Modal } from './Modal'

/** Novo segmento — sem cliente é modo prospecção livre (Parte 2). */
export function FormSegmento({
  clientes,
}: {
  clientes: Pick<Cliente, 'id' | 'nome'>[]
}) {
  const [aberto, setAberto] = useState(false)
  const router = useRouter()
  const [estado, acao, pendente] = useActionState<Resultado | null, FormData>(
    criarSegmento,
    null,
  )

  useEffect(() => {
    if (estado?.ok && estado.id) {
      setAberto(false)
      router.push(`/segmentos/${estado.id}`)
    }
  }, [estado, router])

  return (
    <>
      <Botao onClick={() => setAberto(true)}>Novo segmento</Botao>
      {aberto && (
        <Modal titulo="Novo segmento" aoFechar={() => setAberto(false)}>
          <form action={acao}>
            <Campo rotulo="Nome do segmento" dica="Ex.: Comunicação visual">
              <Entrada name="nome" required autoFocus />
            </Campo>
            <div className="mt-4">
              <Campo
                rotulo="Cliente"
                dica="Opcional — deixe em branco para prospecção livre."
              >
                <Selecao name="cliente_id" defaultValue="">
                  <option value="">Sem cliente (prospecção)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            {estado && !estado.ok && (
              <p className="mt-4 text-xs text-magenta">! {estado.erro}</p>
            )}

            <div className="mt-5 flex gap-2">
              <Botao type="submit" disabled={pendente}>
                {pendente ? 'Criando…' : 'Criar segmento'}
              </Botao>
              <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
                Cancelar
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
