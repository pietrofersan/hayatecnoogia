'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { programarConteudo } from '@/lib/acoes'
import { Botao } from './Campo'

/** Converte ISO -> valor de <input type="datetime-local"> em hora local. */
function paraCampo(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

/**
 * Data de publicação: é isto que faz a peça aparecer no calendário.
 * Sem data, ela existe só na lista de Conteúdo gerado.
 */
export function FormProgramar({
  id,
  publicarEm,
}: {
  id: string
  publicarEm: string | null
}) {
  const router = useRouter()
  const [valor, setValor] = useState(paraCampo(publicarEm))
  const [pendente, iniciar] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function salvar(quando: string | null) {
    iniciar(async () => {
      setErro(null)
      const r = await programarConteudo(id, quando)
      if (!r.ok) setErro(r.erro)
      else router.refresh()
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="min-h-[36px] flex-1 rounded-ctrl border border-borda bg-white/[0.03] px-2.5 font-mono text-[11px] text-corpo outline-none focus:border-azul/45"
        />
        <Botao
          variante="secundario"
          disabled={pendente || !valor}
          onClick={() => salvar(valor)}
        >
          {pendente ? '…' : 'Agendar'}
        </Botao>
        {publicarEm && (
          <Botao
            variante="texto"
            disabled={pendente}
            onClick={() => {
              setValor('')
              salvar(null)
            }}
          >
            Tirar da agenda
          </Botao>
        )}
      </div>
      {erro && <p className="mt-1 text-[10.5px] text-magenta-claro">! {erro}</p>}
    </div>
  )
}
