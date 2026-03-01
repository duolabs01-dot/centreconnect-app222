'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  LngLatBounds,
  NavigationControl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { DirectoryCentre } from '@/types/directory-centre'

interface DirectoryMapProps {
  centresWithLocation: DirectoryCentre[]
  userLocation: [number, number] | null
  locationHint: string
  showMap: boolean
}

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthKm = 6371
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * earthKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export default function DirectoryMap({ centresWithLocation, userLocation, locationHint, showMap }: DirectoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      try {
        // Fix: Use OpenFreeMap Liberty style (Free, no API key needed)
        // Ensure maplibre-gl is used correctly
        mapInstanceRef.current = new MapLibreMap({
          container: mapContainerRef.current,
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [28.0473, -26.2041], // Johannesburg default
          zoom: 11,
          antialias: true
        })

        mapInstanceRef.current.addControl(new NavigationControl({ showCompass: false }), 'top-right')

        mapInstanceRef.current.on('error', (e) => {
          console.warn('Map failed to load', e)
          setMapError(true)
        })

      } catch (err) {
        console.error('Map initialization failed:', err)
        setMapError(true)
      }
    }

    // Force resize when visibility toggles
    setTimeout(() => mapInstanceRef.current?.resize(), 100)

    return () => {
      // Cleanup if needed, though usually maplibre handles it
    }
  }, [showMap])

  useEffect(() => {
    if (!showMap || !mapInstanceRef.current || mapError) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    centresWithLocation.forEach((centre) => {
      if (!centre.longitude || !centre.latitude) return

      const popup = new Popup({ offset: 15 }).setHTML(
        `<strong>${centre.name}</strong><p class="text-xs text-slate-500">${centre.suburb}</p>`
      )
      const marker = new Marker({ color: '#06b6d4' })
        .setLngLat([centre.longitude, centre.latitude])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!)
      markersRef.current.push(marker)
    })

    // Bounds fitting logic
    if (userLocation && centresWithLocation.length > 0) {
      const nearby = [...centresWithLocation]
        .sort((a, b) => {
          const aPoint: [number, number] = [a.longitude as number, a.latitude as number]
          const bPoint: [number, number] = [b.longitude as number, b.latitude as number]
          return distanceKm(userLocation, aPoint) - distanceKm(userLocation, bPoint)
        })
        .slice(0, 10)

      const bounds = new LngLatBounds()
      bounds.extend(userLocation)
      nearby.forEach((centre) => {
        bounds.extend([centre.longitude as number, centre.latitude as number])
      })

      mapInstanceRef.current.fitBounds(bounds, {
        padding: 72,
        maxZoom: 14,
      })
    } else if (centresWithLocation.length > 0) {
      const bounds = new LngLatBounds()
      centresWithLocation.forEach((centre) => {
        bounds.extend([centre.longitude as number, centre.latitude as number])
      })
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 72,
        maxZoom: 13,
      })
    } else if (userLocation) {
      mapInstanceRef.current.flyTo({ center: userLocation, zoom: 13.5, essential: true })
    }
  }, [centresWithLocation, showMap, userLocation, mapError])

  useEffect(() => {
    if (!showMap || !mapInstanceRef.current || !userLocation || mapError) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation)
    } else {
      userMarkerRef.current = new Marker({ color: '#facc15' })
        .setLngLat(userLocation)
        .setPopup(new Popup({ offset: 12 }).setText('You are here'))
        .addTo(mapInstanceRef.current)
    }
  }, [userLocation, showMap, mapError])

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !userLocation || mapError) return
    mapInstanceRef.current.flyTo({
      center: userLocation,
      zoom: 13.5,
      essential: true,
      speed: 1.1,
      curve: 1.2,
    })
  }

  if (mapError) {
    return (
      <div className="flex h-[260px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 text-center sm:h-[420px]">
        <p className="text-sm font-semibold text-slate-600">Map unavailable</p>
        <a 
          href={`https://www.google.com/maps/search/ECD+centres+near+${locationHint}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold text-cyan-600 underline"
        >
          Open in Google Maps
        </a>
      </div>
    )
  }

  return (
    <div 
      className="relative h-[260px] sm:h-[420px] w-full rounded-2xl border border-border overflow-hidden bg-slate-100"
      aria-label="ECD centres map near you"
      role="region"
    >
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {centresWithLocation.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[2px]">
          <div className="px-4 text-center">
            <p className="text-sm font-semibold text-slate-700">Location data is being added</p>
            <p className="mt-1 text-xs text-slate-500">Centre coordinates are being verified. Check back soon.</p>
          </div>
        </div>
      )}

      {userLocation && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute left-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[var(--shadow-elevation-1)] backdrop-blur transition-all hover:bg-white active:scale-95"
        >
          Recenter
        </button>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-end justify-start">
        <span className="rounded-full bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur">
          {locationHint}
        </span>
      </div>

      {/* Centre Count Badge */}
      <div className="absolute top-3 right-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-sm backdrop-blur">
        {centresWithLocation.length} centres on map
      </div>
    </div>
  )
}
