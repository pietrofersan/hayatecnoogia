'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  checarDominiosDaPalavra,
  marcarInteressante,
  vigiarDominioDaPalavra,
} from '@/lib/acoes'
import { ROTULO_TENDENCIA, type ChecagemDominio, type PalavraChave } from '@/lib/db'
import { normalizarTermo } from '@/lib/rdap'
import { Celula, Linha } from './Tabela'

const EXTENSOES = ['com', 'com.br', 'net'] as const

/**
 * Chip de extensão. Depois de checado vira botão: clicar põe o domínio no
 * radar (Módulo 2), que reconsulta todo dia — inclusive o que está
 * registrado, para avisar quando expirar.
 */
function ChipDominio({
  extensao,
  checagem,
  onVigiar,
  vigiando,
}: {
  extensao: string
  checagem?: ChecagemDominio
  onVigiar: () => void
  vigiando: boolean
}) {
  if (!checagem || checagem.disponivel === null) {
    return (
      <span className="rounded border border-linha px-1.5 py-0.5 text-[10px] text-apagado">
        .{extensao}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onVigiar}
      disabled={vigiando}
      className={`rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50 ${
        checagem.disponivel
          ? 'border-ok/40 text-ok hover:bg-ok/10'
          : 'border-critico/40 text-critico hover:bg-critico/10'
      }`}
      title={`${checagem.disponivel ? 'Domínio livre' : 'Domínio registrado'} — clique para vigiar no radar`}
    >
      {checagem.disponivel ? '✓' : '×'} .{extensao}
    </button>
  )
}

export function LinhaPalavra({
  palavra,
  checagens,
}: {
  palavra: PalavraChave
  checagens: ChecagemDominio[]
}) {
  const router = useRouter()
  const [checando, iniciarChecagem] = useTransition()
  const [marcando, iniciarMarcacao] = useTransition()
  const [vigiando, iniciarVigia] = useTransition()
  const [interessante, setInteressante] = useState(palavra.interessante)
  const [aviso, setAviso] = useState<string | null>(null)

  const porExtensao = new Map(checagens.map((c) => [c.extensao, c]))

  return (
    <Linha>
      <Celula>
        <button
          onClick={() =>
            iniciarMarcacao(async () => {
              const novo = !interessante
              setInteressante(novo)
              await marcarInteressante(palavra.id, novo)
              router.refresh()
            })
          }
          disabled={marcando}
          title={interessante ? 'Desmarcar interessante' : 'Marcar como interessante'}
          className={interessante ? 'text-ouro' : 'text-apagado hover:text-nevoa'}
        >
          {interessante ? '★' : '☆'}
        </button>
      </Celula>
      <Celula>{palavra.termo}</Celula>
      <Celula>
        {palavra.tendencia ? (
          ROTULO_TENDENCIA[palavra.tendencia]
        ) : (
          <span className="text-apagado">aguardando</span>
        )}
      </Celula>
      <Celula numerica>
        {palavra.volume ?? <span className="text-apagado">aguardando</span>}
      </Celula>
      <Celula>
        <div className="flex flex-wrap items-center gap-1.5">
          {EXTENSOES.map((ext) => (
            <ChipDominio
              key={ext}
              extensao={ext}
              checagem={porExtensao.get(ext)}
              vigiando={vigiando}
              onVigiar={() =>
                iniciarVigia(async () => {
                  setAviso(null)
                  const r = await vigiarDominioDaPalavra(
                    palavra.id,
                    `${normalizarTermo(palavra.termo)}.${ext}`,
                  )
                  setAviso(r.ok ? 'no radar ✓' : r.erro)
                })
              }
            />
          ))}
          <button
            onClick={() =>
              iniciarChecagem(async () => {
                await checarDominiosDaPalavra(palavra.id, palavra.termo)
                router.refresh()
              })
            }
            disabled={checando}
            className="ml-1 text-[10px] text-tec hover:underline disabled:opacity-50"
          >
            {checando ? 'checando…' : 'checar'}
          </button>
          {aviso && <span className="text-[10px] text-apagado">{aviso}</span>}
        </div>
      </Celula>
    </Linha>
  )
}
