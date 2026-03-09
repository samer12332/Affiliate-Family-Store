import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AppChrome } from '@/components/shared/AppChrome'
import './globals.css'

export const metadata: Metadata = {
  title: 'FamilyStore - Clothing & Accessories for the Whole Family',
  description: 'Shop quality clothing, shoes, and accessories for men, women, and children. Fast delivery across Egypt.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
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
        <Analytics />
      </body>
    </html>
  )
}
