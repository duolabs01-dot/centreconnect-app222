import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Inter, Nunito, DM_Sans } from 'next/font/google'
import "./globals.css"
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ThemeRouteSync } from '@/components/theme/theme-route-sync'
import { FooterConditionalRenderer } from '@/components/layout/FooterConditionalRenderer'
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: 'CentreConnect',
  description: 'Find trusted ECD centres near you. Apply online, track applications, and connect with the best early childhood education for your child.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
      <body className="font-sans">
        <ThemeProvider>
          <ThemeRouteSync />
            <FooterConditionalRenderer>
              {children}
            </FooterConditionalRenderer>
          <SonnerToaster position="top-right" richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
