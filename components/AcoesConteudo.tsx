'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { aprovarConteudo, devolverConteudo } from '@/lib/acoes'
import { Botao } from './Campo'

/**
 * Par Devolver/Aprovar do handoff (§7 e fila do §5). Aparece só em peça
 * `aguardando` — é o único caminho para `aprovado`.
 */
export function AcoesConteudo({ id, compacto }: { id: string; compacto?: boolean }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    iniciar(async () => {
      setErro(null)
      const r = await acao()
      if (!r.ok) setErro(r.erro ?? 'Não deu para salvar.')
      else router.refresh()
    })
  }

  return (
    <div>
      <div className={compacto ? 'flex gap-2' : 'grid grid-cols-2 gap-2'}>
        <Botao
          variante="secundario"
          disabled={pendente}
          onClick={() => executar(() => devolverConteudo(id))}
          className={compacto ? undefined : 'w-full'}
        >
          Devolver
        </Botao>
        <Botao
          variante="verde"
          disabled={pendente}
          onClick={() => executar(() => aprovarConteudo(id))}
          className={compacto ? undefined : 'w-full'}
        >
          {pendente ? '…' : 'Aprovar'}
        </Botao>
      </div>
      {erro && <p className="mt-1.5 text-[11px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
