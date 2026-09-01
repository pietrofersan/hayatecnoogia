'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { alternarRadar, checarRadarAgora } from '@/lib/acoes'
import type { DominioRadar } from '@/lib/db'
import { ROTULO_ESTADO_DOMINIO } from '@/lib/db'
import { formatData } from '@/lib/money'
import { diasAte } from '@/lib/radar'
import { Celula, Linha } from './Tabela'

const COR: Record<DominioRadar['estado'], string> = {
  livre: 'text-ok',
  registrado: 'text-nevoa',
  indeterminado: 'text-apagado',
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
  const perto = dias !== null && dias <= 60

  return (
    <Linha>
      <Celula>
        <span className={dominio.ativo ? 'text-marfim' : 'text-apagado line-through'}>
          {dominio.dominio}
        </span>
        {dominio.motivo && (
          <span className="block text-[11px] text-apagado">{dominio.motivo}</span>
        )}
        {cliente && <span className="block text-[11px] text-tec">{cliente}</span>}
      </Celula>

      <Celula>
        <span className={COR[dominio.estado]}>{ROTULO_ESTADO_DOMINIO[dominio.estado]}</span>
      </Celula>

      <Celula>
        {dominio.expira_em ? (
          <span className={perto ? 'text-alerta' : undefined}>
            {formatData(dominio.expira_em)}
            {dias !== null && (
              <span className="block text-[11px] text-apagado">
                {dias < 0 ? 'já passou' : `em ${dias} dia(s)`}
              </span>
            )}
          </span>
        ) : (
          '—'
        )}
      </Celula>

      <Celula>
        <span className="text-[11px] text-apagado">{dominio.registrador ?? '—'}</span>
      </Celula>

      <Celula>
        <span className="text-[11px] text-apagado">
          {dominio.checado_em ? formatData(dominio.checado_em) : 'nunca'}
        </span>
      </Celula>

      <Celula>
        <div className="flex justify-end gap-3 text-xs">
          <button
            type="button"
            disabled={pendente}
            className="text-nevoa hover:text-marfim disabled:opacity-50"
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
          </button>
          <button
            type="button"
            disabled={pendente}
            className="text-apagado hover:text-marfim disabled:opacity-50"
            onClick={() =>
              iniciar(async () => {
                await alternarRadar(dominio.id, !dominio.ativo)
                router.refresh()
              })
            }
          >
            {dominio.ativo ? 'Pausar' : 'Retomar'}
          </button>
        </div>
        {erro && <p className="text-right text-[11px] text-critico">! {erro}</p>}
      </Celula>
    </Linha>
  )
}
