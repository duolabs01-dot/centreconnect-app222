import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import "./globals.css"
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeRouteSync } from '@/components/theme/theme-route-sync'
import { FooterConditionalRenderer } from '@/components/layout/FooterConditionalRenderer'
import { Analytics } from "@vercel/analytics/next"
import { ServiceWorkerRegister } from '@/lib/components/ServiceWorkerRegister'
import { LiteModeProvider } from '@/lib/context/LiteModeProvider'
import { SessionTimeoutProvider } from '@/lib/context/SessionTimeoutProvider'
import { BottomNavProvider } from '@/lib/context/BottomNavProvider'

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
const iconVersion = '20260303-v1'

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: 'CentreConnect',
  description: 'Find trusted ECD centres near you. Apply online, track applications, and connect with the best early childhood education for your child.',
  applicationName: 'CentreConnect',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: `/favicon.ico?v=${iconVersion}`, type: 'image/x-icon' },
      { url: `/icon-192.png?v=${iconVersion}`, sizes: '192x192', type: 'image/png' },
      { url: `/icon-512.png?v=${iconVersion}`, sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${iconVersion}`, sizes: '180x180', type: 'image/png' }],
    shortcut: [`/favicon.ico?v=${iconVersion}`],
  },
  appleWebApp: {
    capable: true,
    title: 'CentreConnect',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#065A82',
}

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display-var',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href={`/favicon.ico?v=${iconVersion}`} sizes="any" />
        <link rel="apple-touch-icon" href={`/apple-touch-icon.png?v=${iconVersion}`} />
        <meta name="theme-color" content="#065A82" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans">
        <LiteModeProvider>
          <SessionTimeoutProvider>
            <BottomNavProvider>
              <ThemeProvider>
                <ThemeRouteSync />
                  <FooterConditionalRenderer>
                    {children}
                  </FooterConditionalRenderer>
                <SonnerToaster position="top-right" richColors />
                <Analytics />
                <ServiceWorkerRegister />
              </ThemeProvider>
            </BottomNavProvider>
          </SessionTimeoutProvider>
        </LiteModeProvider>
      </body>
    </html>
  )
}
