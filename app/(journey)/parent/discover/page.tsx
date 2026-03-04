import type { Metadata } from 'next'
import ParentDiscoverClient from './discover-client'

export const metadata: Metadata = {
  title: 'Discover Crèches | CentreConnect',
  description: 'Browse premium, parent-friendly crèches and apply with confidence.',
}

export default function ParentDiscoverPage() {
  return <ParentDiscoverClient />
}
