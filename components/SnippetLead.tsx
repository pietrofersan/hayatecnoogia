'use client'

import { useState } from 'react'

/** Snippet padrão dos formulários dos sites dos clientes (seção 5). */
export function SnippetLead({ siteKey, base }: { siteKey: string; base: string }) {
  const [copiado, setCopiado] = useState(false)

  const snippet = `<form id="haya-lead">
  <input name="nome" placeholder="Nome" required />
  <input name="email" type="email" placeholder="E-mail" />
  <input name="telefone" placeholder="Telefone" />
  <textarea name="mensagem" placeholder="Mensagem"></textarea>
  <input name="empresa" tabindex="-1" autocomplete="off" style="display:none" />
  <label>
    <input name="consentimento" type="checkbox" required />
    Autorizo o contato e o tratamento dos meus dados (LGPD).
  </label>
  <button type="submit">Enviar</button>
</form>
<script>
document.getElementById('haya-lead').addEventListener('submit', async (e) => {
  e.preventDefault()
  const f = new FormData(e.target)
  const p = new URLSearchParams(location.search)
  await fetch('${base}/api/leads/${siteKey}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: f.get('nome'),
      email: f.get('email'),
      telefone: f.get('telefone'),
      mensagem: f.get('mensagem'),
      empresa: f.get('empresa'),
      consentimento: f.get('consentimento') === 'on',
      origem: {
        pagina: location.pathname,
        utm_source: p.get('utm_source'),
        utm_medium: p.get('utm_medium'),
        utm_campaign: p.get('utm_campaign'),
      },
    }),
  })
  e.target.reset()
  alert('Recebemos seu contato!')
})
</script>`

  return (
    <div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(snippet)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        }}
        className="mb-2 text-xs text-tec hover:underline"
      >
        {copiado ? '✓ copiado' : 'copiar snippet'}
      </button>
      <pre className="max-h-64 overflow-auto rounded-lg border border-linha bg-noite p-3 font-mono text-[11px] text-ink-2">
        {snippet}
      </pre>
    </div>
  )
}
