'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Map as MapIcon, LayoutGrid, Check, X, MapPin, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import CentreCard from '@/components/parent/CentreCard'
import { cn } from '@/lib/utils'
import type { DirectoryCentre } from '@/types/directory-centre'
import { useBottomNav } from '@/lib/context/BottomNavProvider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"

const DirectoryMap = dynamic(
  () => import('./DirectoryMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-[2.5rem] bg-slate-100 animate-pulse-slow
                      flex items-center justify-center border-2 border-dashed border-slate-200">
        <p className="text-slate-400 text-sm font-medium">
          Loading map...
        </p>
      </div>
    ),
  }
)

type DirectoryFilters = {
  search?: string
  suburb?: string
  age?: string
  fee?: string
  subsidy?: boolean
  page?: number
}

type DirectoryExplorerProps = {
  initialCentres: DirectoryCentre[]
  totalResults: number
  pageSize: number
  initialPage: number
  initialFilters: DirectoryFilters
  suburbs: string[]
  ageGroups: string[]
}

const FEE_OPTIONS = [
  { label: 'Any fee', value: '' },
  { label: 'Under R800', value: '800' },
  { label: 'Under R1200', value: '1200' },
  { label: 'Under R2000', value: '2000' },
]

export default function DirectoryExplorer({
  initialCentres,
  totalResults: initialTotal,
  pageSize,
  initialPage,
  initialFilters,
  suburbs,
  ageGroups,
}: DirectoryExplorerProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [centres, setCentres] = useState(initialCentres)
  const [totalResults, setTotalResults] = useState(initialTotal)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const [search, setSearch] = useState(initialFilters.search ?? '')
  const [selectedSuburb, setSelectedSuburb] = useState(initialFilters.suburb ?? '')
  const [selectedAge, setSelectedAge] = useState(initialFilters.age ?? '')
  const [selectedFee, setSelectedFee] = useState(initialFilters.fee ?? '')
  const [selectedSubsidy, setSelectedSubsidy] = useState(initialFilters.subsidy ? 'true' : '')
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [debouncedSearch, setDebouncedSearch] = useState(initialFilters.search ?? '')
  const [isPending, startTransition] = useTransition()
  const { setVisible } = useBottomNav()
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle')

  useEffect(() => {
    setVisible(!isFilterSheetOpen)
    return () => setVisible(true)
  }, [isFilterSheetOpen, setVisible])

  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const hasActiveFilters = Boolean(selectedSuburb || selectedAge || selectedFee || selectedSubsidy === 'true')

  // Quick Filters
  const quickFilters = [
    { label: '📍 Near Me', active: geoStatus === 'granted', onClick: () => activateMapView() },
    { label: '🏢 Alexandra', active: selectedSuburb === 'Alexandra', onClick: () => { setSelectedSuburb('Alexandra'); setCurrentPage(1); } },
    { label: '💸 Subsidy', active: selectedSubsidy === 'true', onClick: () => { setSelectedSubsidy(selectedSubsidy === 'true' ? '' : 'true'); setCurrentPage(1); } },
    { label: '👶 Infants', active: selectedAge === 'Infants (0-1 year)', onClick: () => { setSelectedAge(selectedAge === 'Infants (0-1 year)' ? '' : 'Infants (0-1 year)'); setCurrentPage(1); } },
  ]

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timeout)
  }, [search])

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (selectedSuburb) params.set('suburb', selectedSuburb)
    if (selectedAge) params.set('age', selectedAge)
    if (selectedFee) params.set('fee', selectedFee)
    if (selectedSubsidy === 'true') params.set('subsidy', 'true')
    if (currentPage > 1) params.set('page', String(currentPage))

    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage, pathname, router])

  // Fetch Data
  useEffect(() => {
    const controller = new AbortController()
    startTransition(async () => {
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (selectedSuburb) params.set('suburb', selectedSuburb)
        if (selectedAge) params.set('age', selectedAge)
        if (selectedFee) params.set('fee', selectedFee)
        if (selectedSubsidy === 'true') params.set('subsidy', 'true')
        params.set('page', String(currentPage))

        const res = await fetch(`/api/directory/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) return
        const payload = await res.json()
        setCentres(payload.centres ?? [])
        setTotalResults(payload.totalResults ?? 0)
      } catch {}
    })
    return () => controller.abort()
  }, [debouncedSearch, selectedSuburb, selectedAge, selectedFee, selectedSubsidy, currentPage])

  const activateMapView = () => {
    if (geoStatus === 'granted') {
        setViewMode('map')
        return
    }
    setGeoStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude])
        setGeoStatus('granted')
        setViewMode('map')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const resetFilters = () => {
    setSearch(''); setDebouncedSearch(''); setSelectedSuburb(''); setSelectedAge(''); 
    setSelectedFee(''); setSelectedSubsidy(''); setCurrentPage(1);
  }

  return (
    <div className="cc-stack">
      {/* Search & Mode Switcher */}
      <div className="sticky top-0 z-[60] -mx-4 bg-white/80 px-4 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search crèches or suburbs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold shadow-sm focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none"
            />
          </div>
          
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-cyan-400 active:scale-90 transition-all">
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2.5rem] px-6 pb-12 pt-8">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-2xl font-black text-slate-900 tracking-tight">Filters</SheetTitle>
              </SheetHeader>
              
              <div className="cc-stack gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Suburb</label>
                  <select 
                    value={selectedSuburb} 
                    onChange={(e) => setSelectedSuburb(e.target.value)}
                    className="h-14 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-cyan-500"
                  >
                    <option value="">All Areas</option>
                    {suburbs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Age Group</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...ageGroups].map(age => (
                      <button
                        key={age}
                        onClick={() => setSelectedAge(age === 'All' ? '' : age)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-bold border transition-all",
                          (age === 'All' ? !selectedAge : selectedAge === age)
                            ? "bg-cyan-600 border-cyan-600 text-white"
                            : "bg-white border-slate-200 text-slate-600"
                        )}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Monthly Budget</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedFee(opt.value)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-bold border transition-all text-left",
                          selectedFee === opt.value
                            ? "bg-cyan-50 border-cyan-600 text-cyan-700"
                            : "bg-white border-slate-200 text-slate-600"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 cursor-pointer">
                  <span className="text-sm font-bold text-slate-700">Accepts Subsidy Only</span>
                  <input
                    type="checkbox"
                    checked={selectedSubsidy === 'true'}
                    onChange={(e) => setSelectedSubsidy(e.target.checked ? 'true' : '')}
                    className="h-6 w-6 rounded-lg border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                </label>
              </div>

              <SheetFooter className="mt-8 gap-3">
                <Button variant="outline" onClick={resetFilters} className="h-14 rounded-2xl font-bold flex-1">Reset All</Button>
                <SheetClose asChild>
                  <Button className="h-14 rounded-2xl bg-cyan-600 font-bold flex-1">Show Results</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick Filter Horizontal Scroll */}
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm border",
              viewMode === 'map' ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600"
            )}
          >
            {viewMode === 'list' ? <MapIcon className="h-3 w-3" /> : <LayoutGrid className="h-3 w-3" />}
            {viewMode === 'list' ? 'Map' : 'List'}
          </button>
          
          <div className="h-8 w-px bg-slate-200 shrink-0 mx-1 self-center" />

          {quickFilters.map((q, i) => (
            <button
              key={i}
              onClick={q.onClick}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm border whitespace-nowrap",
                q.active ? "bg-cyan-50 border-cyan-300 text-cyan-700" : "bg-white border-slate-200 text-slate-600"
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[400px]">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isPending && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 z-10 flex justify-center py-8 bg-white/40 backdrop-blur-[2px] rounded-3xl h-full"
            >
              <div className="flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-bold text-white shadow-xl">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Updating Results...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'map' ? (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-400">
                {geoStatus === 'granted' ? 'Showing centres near you' : 'Mappable centres in this area'}
              </p>
              <button 
                onClick={activateMapView}
                className="text-xs font-black text-cyan-600 uppercase tracking-widest hover:text-cyan-800"
              >
                Refresh Location
              </button>
            </div>
            <DirectoryMap
              centresWithLocation={centres.filter(c => c.latitude && c.longitude)}
              userLocation={userLocation}
              locationHint={geoStatus === 'granted' ? '' : 'Allow location for better results'}
              showMap={true}
            />
          </div>
        ) : (
          <div className="cc-stack">
            {centres.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center px-6"
              >
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">No crèches found here.</h3>
                <p className="mt-2 text-sm text-slate-500 max-w-xs">Try adjusting your filters or expanding your search to other suburbs.</p>
                <Button variant="outline" onClick={resetFilters} className="mt-6 rounded-2xl h-12 font-bold border-slate-200">Clear All Filters</Button>
              </motion.div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {centres.map((centre, i) => (
                  <motion.div
                    key={centre.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <CentreCard
                      {...centre}
                      capacity={centre.capacity ?? undefined}
                      age_groups={centre.age_groups ?? []}
                      tagline={centre.tagline ?? undefined}
                      logo_url={centre.logo_url ?? undefined}
                      cover_image_url={centre.cover_image_url ?? undefined}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-between border-t border-slate-100 pt-6">
                <p className="text-xs font-bold text-slate-400">
                  Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-30 active:scale-95 transition-all"
                  >
                    Previous
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Nudge for Guest Users — Shown at the bottom when they have results to encourage conversion */}
      {!initialFilters.search && !hasActiveFilters && centres.length > 0 && (
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-10 text-white relative overflow-hidden shadow-2xl"
         >
            <div className="absolute -top-12 -right-12 p-8 opacity-10 rotate-12">
              <Sparkles className="h-48 w-48 text-cyan-400" />
            </div>
            
            <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-400 mb-4 border border-cyan-500/30">
                  <Sparkles className="h-3 w-3" />
                  Premium Features
                </div>
                <h3 className="text-3xl font-black tracking-tight leading-[1.1] mb-4">
                  Find the perfect crèche, then let us handle the rest.
                </h3>
                <p className="text-slate-300 text-lg mb-8 font-medium leading-relaxed">
                  Join 500+ parents who use CentreConnect to manage documents, get daily reports, and track applications in real-time.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="h-14 rounded-2xl bg-cyan-500 text-slate-900 font-black hover:bg-cyan-400 shadow-xl shadow-cyan-500/20 px-8">
                    <Link href="/register">Create Free Account</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-14 rounded-2xl border-white/20 text-white bg-transparent font-bold hover:bg-white/10 px-8">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Check, label: "1-Tap Applications" },
                  { icon: Check, label: "Document Vault" },
                  { icon: Check, label: "Daily Reports" },
                  { icon: Check, label: "Instant Messaging" }
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                      <f.icon className="h-3.5 w-3.5 text-slate-900 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold text-slate-200">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
         </motion.div>
      )}
    </div>
  )
}
