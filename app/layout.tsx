'use client' // Make it a client component

import type { Metadata } from "next" // Metadata import might need to be removed or handled differently for client components
import { Orbitron, Inter } from 'next/font/google'
import "./globals.css"
import { Toaster } from 'react-hot-toast'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
// import { GlobalBottomNav } from '@/components/nav/GlobalBottomNav' // No longer needed directly here
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeRouteSync } from '@/components/theme/theme-route-sync'
import { FooterConditionalRenderer } from '@/components/layout/FooterConditionalRenderer'
import { usePathname } from 'next/navigation' // Import usePathname

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})



export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminPath = pathname.startsWith('/admin')

  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <ThemeRouteSync />
          {isAdminPath ? (
            children
          ) : (
            <FooterConditionalRenderer>
              {children}
            </FooterConditionalRenderer>
          )}
          <Toaster position="top-right" />
          <SonnerToaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
