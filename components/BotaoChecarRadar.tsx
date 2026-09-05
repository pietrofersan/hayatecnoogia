'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { checarRadarAgora } from '@/lib/acoes'
import { Botao } from './Campo'

/** Roda a mesma rotina do cron, agora, para os domínios ativos. */
export function BotaoChecarRadar() {
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
            const r = await checarRadarAgora()
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Checando…' : '↻ Checar todos'}
      </Botao>
      {erro && <p className="mt-1 text-xs text-magenta">! {erro}</p>}
    </div>
  )
}
