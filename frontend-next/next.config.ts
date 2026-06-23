import type { NextConfig } from 'next'

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Serve backend-uploaded images same-origin (no CORS, token-free static).
    return [{ source: '/uploads/:path*', destination: `${API}/uploads/:path*` }]
  },
  async redirects() {
    // The backend reset email hardcodes /redefinir-senha.html?token=...
    return [
      {
        source: '/redefinir-senha.html',
        destination: '/redefinir-senha',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
