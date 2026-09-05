'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assumirConversa, moverConversaDeEstagio, mudarStatusConversa } from '@/lib/acoes'
import type { EstagioFunil, StatusConversa } from '@/lib/db'
import { Botao, Selecao } from './Campo'

/** Cabeçalho da thread: status, estágio do funil e atribuição do agente. */
export function AcoesConversa({
  conversaId,
  status,
  estagioId,
  estagios,
  minha,
}: {
  conversaId: string
  status: StatusConversa
  estagioId: string | null
  estagios: Pick<EstagioFunil, 'id' | 'name'>[]
  minha: boolean
}) {
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
    <div className="flex flex-wrap items-center gap-2">
      <Selecao
        aria-label="Status da conversa"
        value={status}
        disabled={pendente}
        onChange={(e) =>
          executar(() =>
            mudarStatusConversa(conversaId, e.target.value as StatusConversa),
          )
        }
        className="w-auto"
      >
        <option value="open">Ativo</option>
        <option value="pending">Pendente</option>
        <option value="closed">Encerrado</option>
      </Selecao>

      <Selecao
        aria-label="Estágio no funil"
        value={estagioId ?? ''}
        disabled={pendente}
        onChange={(e) =>
          executar(() => moverConversaDeEstagio(conversaId, e.target.value || null))
        }
        className="w-auto"
      >
        <option value="">Sem estágio</option>
        {estagios.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </Selecao>

      <Botao
        variante="secundario"
        disabled={pendente}
        onClick={() => executar(() => assumirConversa(conversaId, !minha))}
      >
        {minha ? 'Devolver para a fila' : 'Assumir'}
      </Botao>

      {erro && <p className="w-full text-xs text-magenta">! {erro}</p>}
    </div>
  )
}
