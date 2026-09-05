import type { StatusContrato } from '@/lib/db'

const ETAPAS: { chave: StatusContrato; rotulo: string }[] = [
  { chave: 'rascunho', rotulo: 'Gerado' },
  { chave: 'enviado', rotulo: 'Enviado' },
  { chave: 'assinado', rotulo: 'Assinado' },
  { chave: 'ativo', rotulo: 'Cobrança ativa' },
]

/** Timeline do mockup: Gerado → Enviado → Assinado → Cobrança ativa. */
export function TimelineContrato({ status }: { status: StatusContrato }) {
  const encerrado = status === 'encerrado' || status === 'suspenso'
  const indiceAtual = encerrado
    ? ETAPAS.length - 1
    : ETAPAS.findIndex((e) => e.chave === status)

  return (
    <ol className="flex items-center gap-1">
      {ETAPAS.map((etapa, i) => {
        const concluida = i <= indiceAtual
        return (
          <li key={etapa.chave} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`grid size-5 place-items-center rounded-full border text-[10px] ${
                  concluida
                    ? 'border-azul bg-azul text-abismo'
                    : 'border-borda text-tenue'
                }`}
                aria-hidden
              >
                {concluida ? '✓' : i + 1}
              </span>
              <span
                className={`text-[10px] whitespace-nowrap ${
                  concluida ? 'text-corpo' : 'text-tenue'
                }`}
              >
                {etapa.rotulo}
              </span>
            </div>
            {i < ETAPAS.length - 1 && (
              <span
                className={`mb-4 h-px flex-1 ${i < indiceAtual ? 'bg-azul' : 'bg-borda'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
