'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { expandirPalavras } from '@/lib/acoes'
import { Botao } from './Campo'

export function BotaoExpandir({ segmentoId }: { segmentoId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div>
      <Botao
        variante="secundario"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await expandirPalavras(segmentoId)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Expandindo…' : '✦ Expandir com IA'}
      </Botao>
      {erro && <p className="mt-2 text-xs text-critico">! {erro}</p>}
    </div>
  )
}
