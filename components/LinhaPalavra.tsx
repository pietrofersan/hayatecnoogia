'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { checarDominiosDaPalavra, marcarInteressante } from '@/lib/acoes'
import { ROTULO_TENDENCIA, type ChecagemDominio, type PalavraChave } from '@/lib/db'
import { Celula, Linha } from './Tabela'

const EXTENSOES = ['com', 'com.br', 'net'] as const

function ChipDominio({ extensao, checagem }: { extensao: string; checagem?: ChecagemDominio }) {
  if (!checagem || checagem.disponivel === null) {
    return (
      <span className="rounded border border-linha px-1.5 py-0.5 text-[10px] text-apagado">
        .{extensao}
      </span>
    )
  }
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] ${
        checagem.disponivel
          ? 'border-ok/40 text-ok'
          : 'border-critico/40 text-critico'
      }`}
      title={checagem.disponivel ? 'Domínio livre' : 'Domínio registrado'}
    >
      {checagem.disponivel ? '✓' : '×'} .{extensao}
    </span>
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
  const [interessante, setInteressante] = useState(palavra.interessante)

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
            <ChipDominio key={ext} extensao={ext} checagem={porExtensao.get(ext)} />
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
        </div>
      </Celula>
    </Linha>
  )
}
