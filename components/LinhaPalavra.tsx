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

/** A tendência carrega a cor semântica: alta verde, queda magenta, estável azul. */
const COR_TENDENCIA = {
  subindo: 'text-verde [text-shadow:0_0_12px_rgba(52,229,176,.55)]',
  caindo: 'text-magenta-claro [text-shadow:0_0_12px_rgba(240,51,143,.55)]',
  estavel: 'text-azul-claro',
} as const

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
      <span className="rounded-chip border border-borda px-2.5 py-1 font-mono text-[10px] text-fantasma">
        .{extensao}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onVigiar}
      disabled={vigiando}
      className={`cursor-pointer rounded-chip border px-2.5 py-1 font-mono text-[10px] transition-colors disabled:opacity-50 ${
        checagem.disponivel
          ? 'border-verde/40 bg-verde/10 text-verde shadow-glow-verde hover:bg-verde/20'
          : 'border-magenta/30 bg-magenta/[0.08] text-magenta-claro hover:bg-magenta/15'
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
          className={`cursor-pointer text-[15px] transition-colors ${
            interessante ? 'text-ambar' : 'text-fantasma hover:text-suave'
          }`}
          style={interessante ? { textShadow: '0 0 12px currentColor' } : undefined}
        >
          {interessante ? '★' : '☆'}
        </button>
      </Celula>
      <Celula>
        <span className="text-pleno">{palavra.termo}</span>
      </Celula>
      <Celula>
        {palavra.tendencia ? (
          <span className={COR_TENDENCIA[palavra.tendencia]}>
            {ROTULO_TENDENCIA[palavra.tendencia]}
          </span>
        ) : (
          <span className="font-mono text-[11px] text-fantasma">aguardando</span>
        )}
      </Celula>
      <Celula numerica mono>
        {palavra.volume ?? <span className="text-fantasma">aguardando</span>}
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
            className="ml-1 cursor-pointer font-mono text-[10px] text-ciano hover:underline disabled:opacity-50"
          >
            {checando ? 'checando…' : 'checar'}
          </button>
          {aviso && <span className="font-mono text-[10px] text-tenue">{aviso}</span>}
        </div>
      </Celula>
    </Linha>
  )
}
