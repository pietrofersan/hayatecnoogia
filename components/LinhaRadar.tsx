'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { alternarRadar, checarRadarAgora } from '@/lib/acoes'
import type { DominioRadar } from '@/lib/db'
import { ROTULO_ESTADO_DOMINIO } from '@/lib/db'
import { formatData } from '@/lib/money'
import { diasAte } from '@/lib/radar'
import { Botao } from './Campo'
import { StatusBadge, type TomBadge } from './StatusBadge'
import { Celula, Linha } from './Tabela'

const TOM: Record<DominioRadar['estado'], TomBadge> = {
  livre: 'verde',
  registrado: 'neutro',
  indeterminado: 'ambar',
}

/** Cor por urgência (README §6): ≤7 magenta, ≤30 âmbar, ≤60 azul, resto apagado. */
function corDoPrazo(dias: number | null): string {
  if (dias === null) return 'text-fantasma'
  if (dias <= 7) return 'text-magenta-claro'
  if (dias <= 30) return 'text-ambar'
  if (dias <= 60) return 'text-azul-claro'
  return 'text-mono'
}

export function LinhaRadar({
  dominio,
  cliente,
}: {
  dominio: DominioRadar
  cliente: string | null
}) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const dias = diasAte(dominio.expira_em)

  return (
    <Linha>
      <Celula>
        <span
          className={`font-mono text-[12px] ${
            dominio.ativo ? 'text-pleno' : 'text-fantasma line-through'
          }`}
        >
          {dominio.dominio}
        </span>
        {dominio.motivo && (
          <span className="block text-[10.5px] text-tenue">{dominio.motivo}</span>
        )}
      </Celula>

      <Celula>
        {cliente ?? <span className="text-fantasma">— sem cliente —</span>}
      </Celula>

      <Celula>
        <StatusBadge tom={TOM[dominio.estado]} brilho={dominio.estado === 'livre'}>
          {ROTULO_ESTADO_DOMINIO[dominio.estado]}
        </StatusBadge>
      </Celula>

      <Celula>
        {dominio.expira_em ? (
          <span className={`font-mono text-[11.5px] ${corDoPrazo(dias)}`}>
            {dias !== null && (dias < 0 ? 'venceu · ' : `${dias} d · `)}
            {formatData(dominio.expira_em)}
          </span>
        ) : (
          <span className="font-mono text-[11.5px] text-fantasma">—</span>
        )}
      </Celula>

      <Celula mono>{dominio.registrador ?? '—'}</Celula>

      <Celula mono>
        {dominio.checado_em ? formatData(dominio.checado_em) : 'nunca'}
      </Celula>

      <Celula numerica>
        <div className="flex justify-end gap-2">
          <Botao
            variante="secundario"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                setErro(null)
                const r = await checarRadarAgora(dominio.id)
                if (!r.ok) setErro(r.erro)
                else router.refresh()
              })
            }
          >
            {pendente ? '…' : 'Checar'}
          </Botao>
          <Botao
            variante="texto"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                await alternarRadar(dominio.id, !dominio.ativo)
                router.refresh()
              })
            }
          >
            {dominio.ativo ? 'Pausar' : 'Retomar'}
          </Botao>
        </div>
        {erro && <p className="mt-1 text-right text-[10.5px] text-magenta-claro">! {erro}</p>}
      </Celula>
    </Linha>
  )
}
