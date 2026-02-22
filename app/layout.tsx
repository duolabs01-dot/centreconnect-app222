import type { Metadata } from "next" 
import { Orbitron, Inter } from 'next/font/google'
import "./globals.css"
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeRouteSync } from '@/components/theme/theme-route-sync'
import { FooterConditionalRenderer } from '@/components/layout/FooterConditionalRenderer'

export const metadata: Metadata = {
  title: 'CentreConnect',
  description: 'Find ECD centres near you.',
}

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

  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <ThemeRouteSync />
            <FooterConditionalRenderer>
              {children}
            </FooterConditionalRenderer>
          <SonnerToaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
