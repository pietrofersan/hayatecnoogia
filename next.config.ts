import type { NextConfig } from 'next'

// typedRoutes fica desligado: as telas montam hrefs com querystring dinâmica
// (filtros de contratos, cobranças e leads), que o modo tipado rejeita.
const nextConfig: NextConfig = {}

export default nextConfig
