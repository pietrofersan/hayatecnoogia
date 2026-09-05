'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { responderConversa } from '@/lib/acoes'
import { Botao } from './Campo'

/**
 * Caixa de resposta da thread. Não entrega nada sozinha: grava a mensagem
 * como `na fila` e é o adaptador de canal (quando existir) que entrega e
 * atualiza o status. O aviso abaixo do botão diz isso, sempre.
 */
export function FormResposta({
  conversaId,
  janelaExpirada,
}: {
  conversaId: string
  janelaExpirada: boolean
}) {
  const router = useRouter()
  const [corpo, setCorpo] = useState('')
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {janelaExpirada && (
        <p className="rounded-ctrl border border-magenta/40 bg-magenta/10 px-3 py-2 text-[11.5px] text-magenta-claro">
          Fora da janela de 24h do WhatsApp. Quando o canal estiver conectado,
          reabrir a conversa vai exigir um template aprovado — regra da Meta,
          não nossa.
        </p>
      )}

      <textarea
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        rows={3}
        placeholder="Escreva a resposta…"
        className="w-full resize-y rounded-ctrl border border-borda-forte bg-[rgba(10,15,30,.72)] px-3.5 py-2.5 text-[13px] text-pleno outline-none transition placeholder:text-fantasma focus:border-ciano focus:shadow-[0_0_0_3px_rgba(34,211,238,.12)]"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-tenue">
          Fica salva como <span className="text-suave">na fila</span> — a entrega
          depende do adaptador do canal, que ainda não existe.
        </p>
        <Botao
          disabled={!corpo.trim() || pendente}
          onClick={() =>
            iniciar(async () => {
              setErro(null)
              const r = await responderConversa(conversaId, corpo)
              if (!r.ok) setErro(r.erro)
              else {
                setCorpo('')
                router.refresh()
              }
            })
          }
        >
          {pendente ? 'Salvando…' : 'Responder'}
        </Botao>
      </div>

      {erro && <p className="text-[11.5px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
