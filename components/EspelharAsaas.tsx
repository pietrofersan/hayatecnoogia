'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { espelharNoAsaas } from '@/lib/acoes'
import { Botao } from './Campo'

/**
 * Sem `asaas_customer_id` o contrato assinado não vira cobrança —
 * este botão refaz o espelho que falhou no cadastro.
 */
export function EspelharAsaas({ clienteId }: { clienteId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Botao
        variante="secundario"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await espelharNoAsaas(clienteId)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Espelhando…' : 'Espelhar no Asaas'}
      </Botao>
      {erro && <p className="text-[11.5px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
