import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HAYA Master',
  description: 'Operação da agência — contratos, cobranças e leads.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-noite">{children}</body>
    </html>
  )
}
