import type { Metadata, Viewport } from 'next'
import { AppChrome } from '@/components/shared/AppChrome'
import { DeferredAnalytics } from '@/components/shared/DeferredAnalytics'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { LanguageProvider } from '@/components/i18n/LanguageProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'FamilyStore - Clothing & Accessories for the Whole Family',
  description: 'Shop quality clothing, shoes, and accessories for men, women, and children. Fast delivery across Egypt.',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="" />
      </head>
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <LanguageProvider>
          <AppChrome>{children}</AppChrome>
        </LanguageProvider>
        <SonnerToaster />
        <DeferredAnalytics />
      </body>
    </html>
  )
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
