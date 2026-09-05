'use client'

import { useState, useTransition } from 'react'
import { enviarRelatorioPorWhatsApp } from '@/lib/acoes'
import { Botao } from './Campo'

export function AcoesRelatorio({
  clienteId,
  resumo,
  urlPdf,
}: {
  clienteId: string
  resumo: string
  urlPdf: string
}) {
  const [pendente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Botao
        variante="verde"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await enviarRelatorioPorWhatsApp(clienteId, resumo)
            setAviso(
              r.ok
                ? { ok: true, texto: 'Resumo na fila de envio do WhatsApp.' }
                : { ok: false, texto: r.erro },
            )
          })
        }
      >
        {pendente ? 'Enfileirando…' : 'Enviar por WhatsApp'}
      </Botao>

      <a
        href={urlPdf}
        className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-2 rounded-btn border border-roxo/40 bg-roxo/12 px-[15px] text-[12.5px] font-medium text-roxo-claro transition hover:bg-roxo/20"
      >
        Exportar PDF
      </a>

      {aviso && (
        <span
          role="status"
          className={`text-[11.5px] ${aviso.ok ? 'text-verde' : 'text-magenta-claro'}`}
        >
          {aviso.ok ? '✓' : '!'} {aviso.texto}
        </span>
      )}
    </div>
  )
}
