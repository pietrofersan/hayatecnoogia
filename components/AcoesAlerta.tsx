'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { resolverAlerta, resolverAlertas } from '@/lib/acoes'
import { Botao } from './Campo'

/** Baixa um alerta: some da central e do dashboard, sem apagar a origem. */
export function BotaoResolver({ chave }: { chave: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div className="text-right">
      <Botao
        variante="verde"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await resolverAlerta(chave)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Baixando…' : 'Resolver'}
      </Botao>
      {erro && <p className="mt-1 text-[11px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}

export function BotaoResolverTodos({ chaves }: { chaves: string[] }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div>
      <Botao
        variante="secundario"
        disabled={pendente || chaves.length === 0}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await resolverAlertas(chaves)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        {pendente ? 'Baixando…' : `Resolver todos · ${chaves.length}`}
      </Botao>
      {erro && <p className="mt-1 text-[11px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
