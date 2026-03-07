'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Map as MapIcon, LayoutGrid, Check, X, MapPin, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const isPilotDefaultArea = selectedSuburb === 'Alexandra' && !debouncedSearch && !selectedAge && !selectedFee && selectedSubsidy !== 'true'

  // Quick Filters
  const quickFilters = [
    { label: 'Near Me', active: geoStatus === 'granted', onClick: () => activateMapView() },
    { label: 'Alexandra', active: selectedSuburb === 'Alexandra', onClick: () => { setSelectedSuburb('Alexandra'); setCurrentPage(1); } },
    { label: 'Subsidy', active: selectedSubsidy === 'true', onClick: () => { setSelectedSubsidy(selectedSubsidy === 'true' ? '' : 'true'); setCurrentPage(1); } },
    { label: 'Infants', active: selectedAge === 'Infants (0-1 year)', onClick: () => { setSelectedAge(selectedAge === 'Infants (0-1 year)' ? '' : 'Infants (0-1 year)'); setCurrentPage(1); } },
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
    <div className="cc-stack overflow-x-clip">
      {/* Search & Mode Switcher */}
      <div className="sticky top-0 z-[60] mx-0 bg-white/80 py-3 backdrop-blur-xl sm:static sm:bg-transparent sm:py-0">
        {isPilotDefaultArea ? (
          <div className="mb-4 flex items-start gap-3 rounded-[1.5rem] border border-cyan-100 bg-cyan-50/50 p-4 text-sm text-cyan-900 shadow-sm">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100">
              <MapPin className="h-3.5 w-3.5 text-cyan-600" />
            </div>
            <p className="font-medium leading-relaxed">
              <strong>Pilot Suburb</strong>: Showing Alexandra first while we expand. You can use the search bar or filters to explore other areas.
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by centre name or suburb..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="h-14 rounded-2xl border-slate-200 bg-white pl-11 pr-4 text-base font-bold shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-cyan-500/20"
            />
          </div>
          
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-2xl border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-cyan-400 active:scale-90"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[3rem] px-6 pb-12 pt-8 border-t-0 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-3xl font-black text-slate-900 tracking-tight">Refine Results</SheetTitle>
              </SheetHeader>
              
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Location</label>
                  <select 
                    value={selectedSuburb} 
                    onChange={(e) => setSelectedSuburb(e.target.value)}
                    className="cc-native-field h-14 w-full rounded-2xl border-slate-200 bg-slate-50 px-4 text-base font-bold outline-none focus:border-cyan-500 shadow-inner"
                  >
                    <option value="">All Johannesburg Areas</option>
                    {suburbs.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Monthly Budget</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FEE_OPTIONS.map(opt => (
                      <Button
                        type="button"
                        key={opt.value}
                        onClick={() => setSelectedFee(opt.value)}
                        variant={selectedFee === opt.value ? 'default' : 'outline'}
                        className={cn(
                          'h-12 rounded-2xl px-4 text-sm font-bold transition-all',
                          selectedFee === opt.value
                            ? 'border-cyan-600 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 shadow-sm'
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Child&apos;s Age Group</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...ageGroups].map(age => (
                      <Button
                        type="button"
                        key={age}
                        onClick={() => setSelectedAge(age === 'All' ? '' : age)}
                        variant={(age === 'All' ? !selectedAge : selectedAge === age) ? 'default' : 'outline'}
                        className={cn(
                          'h-11 rounded-2xl px-5 text-sm font-bold transition-all',
                          (age === 'All' ? !selectedAge : selectedAge === age)
                            ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 shadow-lg shadow-cyan-900/20'
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        {age.replace(/(\d+)([my])/g, '$1$2 old')}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center justify-between h-16 w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 cursor-pointer shadow-inner transition-colors hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">Accepts Government Subsidy</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedSubsidy === 'true'}
                      onChange={(e) => setSelectedSubsidy(e.target.checked ? 'true' : '')}
                      className="h-6 w-6 rounded-lg border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                  </label>
                </div>
              </div>

              <SheetFooter className="mt-10 gap-3">
                <Button variant="outline" onClick={resetFilters} className="h-14 rounded-2xl font-black flex-1 border-2">Reset All</Button>
                <SheetClose asChild>
                  <Button className="h-14 rounded-2xl bg-slate-900 font-black flex-1 shadow-xl">Apply Filters</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick Filter Horizontal Scroll */}
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2">
          <Button
            type="button"
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            variant={viewMode === 'map' ? 'default' : 'outline'}
            className={cn(
              'h-10 shrink-0 rounded-full px-5 text-xs font-black uppercase tracking-widest transition-all shadow-sm',
              viewMode === 'map'
                ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200'
            )}
          >
            {viewMode === 'list' ? <MapIcon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {viewMode === 'list' ? 'Map View' : 'List View'}
          </Button>
          
          <div className="h-8 w-px bg-slate-200 shrink-0 mx-1 self-center" />

          {quickFilters.map((q, i) => (
            <Button
              type="button"
              key={i}
              onClick={q.onClick}
              variant={q.active ? 'default' : 'outline'}
              className={cn(
                'h-10 shrink-0 whitespace-nowrap rounded-full px-5 text-xs font-bold transition-all shadow-sm',
                q.active
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-200'
              )}
            >
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative min-h-[500px] mt-2">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isPending && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-0 z-10 flex h-full justify-center rounded-3xl bg-white/40 py-12 backdrop-blur-[2px]"
            >
              <div className="flex h-12 items-center gap-3 rounded-full bg-slate-900 px-6 text-sm font-black text-white shadow-2xl">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Finding Results...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {viewMode === 'map' ? (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-400">
                {geoStatus === 'granted' ? 'Showing centres near your location' : 'Mappable centres in this area'}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={activateMapView}
                className="h-8 rounded-2xl px-3 text-[10px] font-black uppercase tracking-widest text-cyan-600 hover:bg-cyan-50 hover:text-cyan-800"
              >
                Update My Location
              </Button>
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
                className="flex flex-col items-center justify-center py-24 text-center px-6"
              >
                <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-6 shadow-inner">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">No centres found here.</h3>
                <p className="mt-2 text-base font-medium text-slate-500 max-w-xs">Try adjusting your filters or searching for a different suburb.</p>
                <Button variant="outline" onClick={resetFilters} className="mt-8 rounded-2xl h-14 px-8 font-black border-2 border-slate-100 hover:bg-slate-50 transition-all">Clear All Filters</Button>
              </motion.div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-16 flex items-center justify-between border-t border-slate-100 pt-8">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-12 rounded-2xl border-2 border-slate-100 px-6 text-sm font-black text-slate-700 transition-all active:scale-95 disabled:opacity-30 hover:bg-slate-50"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-12 rounded-2xl bg-slate-900 px-8 text-sm font-black text-white shadow-xl shadow-slate-900/20 transition-all active:scale-95 hover:bg-slate-800 disabled:opacity-30"
                  >
                    Next Page
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth nudge for guest users, shown when they have directory results */}
      {!initialFilters.search && !hasActiveFilters && centres.length > 0 && (
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 p-10 text-white relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.25)]"
         >
            <div className="absolute -top-12 -right-12 p-8 opacity-10 rotate-12">
              <Sparkles className="h-64 w-64 text-cyan-400" />
            </div>
            
            <div className="relative z-10 grid gap-12 md:grid-cols-2 md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/20 px-5 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 mb-6 border border-cyan-500/30 backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  Premium Parent Experience
                </div>
                <h3 className="text-4xl font-black tracking-tight leading-[1.05] mb-6">
                  Ready to enroll your child? Let us handle the rest.
                </h3>
                <p className="text-slate-300 text-lg mb-10 font-medium leading-relaxed max-w-md">
                  Create your secure parent profile to manage documents, track responses, and get daily school reports in one place.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="h-16 rounded-[1.5rem] bg-cyan-500 text-slate-950 font-black hover:bg-cyan-400 shadow-2xl shadow-cyan-500/30 px-10 text-base">
                    <Link href="/register?next=%2Fdirectory">Join Now — It&apos;s Free</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-16 rounded-[1.5rem] border-white/20 text-white bg-white/5 font-bold hover:bg-white/10 px-8 backdrop-blur-sm">
                    <Link href="/login?next=%2Fdirectory">Sign in</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {[
                  { icon: Check, label: "Digital Enrollment Journey", desc: "No more paper forms or WhatsApp chasing." },
                  { icon: Check, label: "Safe & Secure Document Vault", desc: "Upload once, apply to any centre securely." },
                  { icon: Check, label: "Real-time Daily Roster Reports", desc: "See your child's attendance and highlights." }
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm transition-transform hover:translate-x-1">
                    <div className="h-8 w-8 rounded-full bg-cyan-500 flex items-center justify-center shrink-0 shadow-lg">
                      <f.icon className="h-4 w-4 text-slate-900 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-black text-white leading-tight">{f.label}</p>
                      <p className="text-sm font-medium text-slate-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
         </motion.div>
      )}
    </div>
  )
}

