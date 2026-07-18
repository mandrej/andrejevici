import type { Metadata } from 'next'
import ClientProviders from './ClientProviders'
import CONFIG from '../config'
import '../styles/app.css'

export const metadata: Metadata = {
  title: CONFIG.title,
  description: 'Andrejevici photo album PWA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        {/* Load Material Symbols Rounded for icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
