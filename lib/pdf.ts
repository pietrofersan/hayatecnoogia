/**
 * Geração do PDF do contrato a partir do HTML renderizado do template.
 *
 * F1 usa um serviço Gotenberg (GOTENBERG_URL) — a alternativa @react-pdf
 * exigiria reescrever os modelos que o Pietro já tem em HTML/DOCX.
 * Sem GOTENBERG_URL configurado a função falha de forma explícita,
 * para não enviar contrato vazio à assinatura.
 */
export async function htmlParaPdf(html: string): Promise<Buffer> {
  const gotenberg = process.env.GOTENBERG_URL
  if (!gotenberg) {
    throw new Error(
      'GOTENBERG_URL não configurada: não é possível gerar o PDF do contrato.',
    )
  }

  const form = new FormData()
  form.append('files', new Blob([html], { type: 'text/html' }), 'index.html')
  form.append('marginTop', '0.8')
  form.append('marginBottom', '0.8')

  const resposta = await fetch(
    `${gotenberg.replace(/\/$/, '')}/forms/chromium/convert/html`,
    { method: 'POST', body: form },
  )

  if (!resposta.ok) {
    throw new Error(`Gotenberg ${resposta.status}: ${await resposta.text()}`)
  }
  return Buffer.from(await resposta.arrayBuffer())
}

/** Moldura padrão do contrato — tipografia serif, A4, sem depender de CSS externo. */
export function moldurarContrato(corpoHtml: string, titulo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${titulo}</title>
    <style>
      @page { size: A4; margin: 20mm 18mm; }
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #12151d; }
      h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; letter-spacing: -0.01em; }
      h1 { font-size: 16pt; margin-bottom: 4mm; }
      h2 { font-size: 12pt; margin-top: 8mm; }
      table { width: 100%; border-collapse: collapse; margin: 4mm 0; }
      td, th { border: 1px solid #d5d2c8; padding: 2mm 3mm; text-align: left; }
      .assinatura { margin-top: 18mm; }
    </style>
  </head>
  <body>${corpoHtml}</body>
</html>`
}
