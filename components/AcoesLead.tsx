'use client'

import { useTransition } from 'react'
import { marcarLead } from '@/lib/acoes'
import type { Lead } from '@/lib/db'

export function AcoesLead({ lead }: { lead: Lead }) {
  const [pendente, iniciar] = useTransition()

  return (
    <div className="flex gap-2.5 text-[11.5px]">
      <button
        disabled={pendente}
        onClick={() => iniciar(() => marcarLead(lead.id, 'lido', !lead.lido))}
        className="text-suave hover:text-pleno disabled:opacity-50"
      >
        {lead.lido ? 'Marcar não lido' : 'Marcar lido'}
      </button>
      <button
        disabled={pendente}
        onClick={() => iniciar(() => marcarLead(lead.id, 'respondido', !lead.respondido))}
        className="text-suave hover:text-pleno disabled:opacity-50"
      >
        {lead.respondido ? 'Reabrir' : 'Marcar respondido'}
      </button>
    </div>
  )
}
