'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { mudarPapel, removerDaEquipe } from '@/lib/acoes'
import { Botao, Selecao } from './Campo'

/** Só aparece para admins; para operadores a RLS já devolve erro. */
export function AcoesUsuario({
  id,
  papel,
  ehVoce,
}: {
  id: string
  papel: string
  ehVoce: boolean
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  if (ehVoce) {
    return <span className="font-mono text-[10.5px] text-fantasma">é você</span>
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Selecao
        defaultValue={papel}
        disabled={pendente}
        aria-label="Perfil"
        className="w-auto py-1.5 text-[11.5px]"
        onChange={(e) =>
          iniciar(async () => {
            setErro(null)
            const r = await mudarPapel(id, e.target.value)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        <option value="admin">admin</option>
        <option value="operador">operador</option>
      </Selecao>

      <Botao
        variante="magenta"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const r = await removerDaEquipe(id)
            if (!r.ok) setErro(r.erro)
            else router.refresh()
          })
        }
      >
        Remover
      </Botao>

      {erro && <span className="text-[11px] text-magenta-claro">! {erro}</span>}
    </div>
  )
}
