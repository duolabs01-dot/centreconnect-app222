'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export type DashboardAudience = 'parent' | 'ecd'

type AdminAudienceContextValue = {
  audience: DashboardAudience
  setAudience: (value: DashboardAudience) => void
}

const AdminAudienceContext = createContext<AdminAudienceContextValue | null>(null)

function normalizeAudience(value: string | null) {
  return value === 'parent' ? 'parent' : 'ecd'
}

export function AdminAudienceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryAudience = useMemo(() => normalizeAudience(searchParams.get('audience')), [searchParams])
  const [audience, setAudienceState] = useState<DashboardAudience>(queryAudience)

  useEffect(() => {
    if (audience !== queryAudience) {
      setAudienceState(queryAudience)
    }
  }, [audience, queryAudience])

  const setAudience = (next: DashboardAudience) => {
    if (next === queryAudience) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('audience', next)
    const query = params.toString()
    const destination = query ? `${pathname}?${query}` : pathname
    router.replace(destination)
    setAudienceState(next)
  }

  return (
    <AdminAudienceContext.Provider value={{ audience, setAudience }}>
      {children}
    </AdminAudienceContext.Provider>
  )
}

export function useAdminAudience() {
  const context = useContext(AdminAudienceContext)
  if (!context) {
    throw new Error('useAdminAudience must be used within AdminAudienceProvider')
  }
  return context
}
