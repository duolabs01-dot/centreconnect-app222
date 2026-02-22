'use client'

import { useEffect, useRef } from 'react'
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

export function DirectoryMap({ centresWithLocation, userLocation, locationHint, showMap }: DirectoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const userMarkerRef = useRef<Marker | null>(null)

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new MapLibreMap({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [18, -26],
        zoom: 11,
      })
      mapInstanceRef.current.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    }

    mapInstanceRef.current.resize()
  }, [showMap])

  useEffect(() => {
    if (!showMap || !mapInstanceRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    centresWithLocation.forEach((centre) => {
      const popup = new Popup({ offset: 15 }).setHTML(
        `<strong>${centre.name}</strong><p class="text-xs text-slate-500">${centre.suburb}</p>`
      )
      const marker = new Marker({ color: '#06b6d4' })
        .setLngLat([centre.longitude!, centre.latitude!])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!)
      markersRef.current.push(marker)
    })

    if (centresWithLocation.length > 0) {
      const bounds = new LngLatBounds()
      centresWithLocation.forEach((centre) => {
        bounds.extend([centre.longitude!, centre.latitude!])
      })
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 14,
      })
    }
  }, [centresWithLocation, showMap])

  useEffect(() => {
    if (!showMap || !mapInstanceRef.current || !userLocation) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userLocation)
    } else {
      userMarkerRef.current = new Marker({ color: '#facc15' })
        .setLngLat(userLocation)
        .setPopup(new Popup({ offset: 12 }).setText('You are here'))
        .addTo(mapInstanceRef.current)
    }
  }, [userLocation, showMap])

  return (
    <div className="relative h-[420px] w-full rounded-2xl border border-border">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-3">
        <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-slate-900">
          {locationHint}
        </span>
      </div>
    </div>
  )
}
