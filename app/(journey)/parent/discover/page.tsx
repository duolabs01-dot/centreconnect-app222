import type { Metadata, Viewport } from 'next'
import ParentDiscoverClient from './discover-client'

const parentDiscoverViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Discover Crèches | CentreConnect',
  description: 'Browse premium, parent-friendly crèches and apply with confidence.',
  viewport: parentDiscoverViewport,
}

export default function ParentDiscoverPage() {
  return <ParentDiscoverClient />
}
