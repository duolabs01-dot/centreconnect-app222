import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CentreConnect',
    short_name: 'CentreConnect',
    description:
      'Find trusted ECD centres near you. Apply online, track applications, and connect with centres.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0891b2',
    orientation: 'portrait',
    icons: [
      {
        src: '/centreconnect-logo.svg?v=20260224-cc',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/centreconnect-logo.svg?v=20260224-cc',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/centreconnect-logo.svg?v=20260224-cc',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/centreconnect-logo.svg?v=20260224-cc',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/centreconnect-logo.svg?v=20260224-cc',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
