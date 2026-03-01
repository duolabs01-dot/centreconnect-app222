'use client'
import { createContext, useContext, type ReactNode } from 'react'

type ParentLayoutData = {
  userName: string
  avatarUrl?: string | null
  isVerified: boolean
  profileNudge: { completionPct: number; missing: string[] } | null
  userId: string
}

const ParentLayoutContext = createContext<ParentLayoutData | null>(null)
export const useParentLayout = () => {
  const context = useContext(ParentLayoutContext);
  if (!context) {
    throw new Error('useParentLayout must be used within a ParentLayoutProvider');
  }
  return context;
};

export function ParentLayoutProvider({
  data,
  children,
}: {
  data: ParentLayoutData
  children: ReactNode
}) {
  return (
    <ParentLayoutContext.Provider value={data}>
      {children}
    </ParentLayoutContext.Provider>
  )
}
