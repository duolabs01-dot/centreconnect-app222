import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Inter, Nunito, DM_Sans } from 'next/font/google'
import "./globals.css"
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeRouteSync } from '@/components/theme/theme-route-sync'
import { FooterConditionalRenderer } from '@/components/layout/FooterConditionalRenderer'
import { Analytics } from "@vercel/analytics/next"
import { ServiceWorkerRegister } from '@/lib/components/ServiceWorkerRegister' // Import the client component

export const metadata: Metadata = {
  title: 'CentreConnect',
  description: 'Find trusted ECD centres near you. Apply online, track applications, and connect with the best early childhood education for your child.',
  applicationName: 'CentreConnect',
  manifest: '/manifest.json', // Updated manifest path
  icons: {
    icon: [
      { url: '/centreconnect-logo.svg?v=20260224-cc', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, // Updated icon path
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, // Updated icon path
    ],
    apple: [{ url: '/apple-touch-icon.png?v=20260224-cc', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icons/icon-192.png'], // Updated icon path
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
  themeColor: '#065A82', // Updated theme color
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

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-parent',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-ecd',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})


export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} ${nunito.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#065A82" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <ThemeRouteSync />
            <FooterConditionalRenderer>
              {children}
            </FooterConditionalRenderer>
          <SonnerToaster position="top-right" richColors />
          <Analytics />
          <ServiceWorkerRegister /> {/* Add the ServiceWorkerRegister component */}
        </ThemeProvider>
      </body>
    </html>
  )
}
