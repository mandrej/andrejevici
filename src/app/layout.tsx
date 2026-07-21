import type { Metadata } from 'next'
import ClientProviders from './ClientProviders'
import CONFIG from '../config'
import '../styles/app.css'

export const metadata: Metadata = {
  title: CONFIG.title,
  description: 'Andrejevici photo album PWA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#212121" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="google-site-verification"
          content="eIABZ7IBZHxZ5X8wm1isGkbGzW9BSyq7nPTS-2w9dr0"
        />
      </head>
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
