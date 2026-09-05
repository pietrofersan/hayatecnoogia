'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ativarCobranca, enviarParaAssinatura } from '@/lib/acoes'
import { Botao } from './Campo'
import type { StatusContrato } from '@/lib/db'

export function AcoesContrato({
  contratoId,
  status,
}: {
  contratoId: string
  status: StatusContrato
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null)
    iniciar(async () => {
      const r = await acao()
      if (!r.ok) setErro(r.erro ?? 'Falha na operação.')
      else router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(status === 'rascunho' || status === 'enviado') && (
          <Botao
            disabled={pendente}
            onClick={() => executar(() => enviarParaAssinatura(contratoId))}
          >
            {status === 'enviado' ? 'Reenviar assinatura' : 'Gerar e enviar p/ assinatura'}
          </Botao>
        )}
        {status === 'assinado' && (
          <Botao disabled={pendente} onClick={() => executar(() => ativarCobranca(contratoId))}>
            Ativar cobrança no Asaas
          </Botao>
        )}
      </div>
      {erro && <p className="text-[11.5px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
