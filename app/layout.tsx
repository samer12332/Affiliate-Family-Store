import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppChrome } from '@/components/shared/AppChrome'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
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
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <AppChrome>{children}</AppChrome>
        <SonnerToaster />
        <Analytics />
      </body>
    </html>
  )
}
