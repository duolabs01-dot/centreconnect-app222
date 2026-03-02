'use client'

import React, { createContext, useContext, useState, useMemo } from 'react'

interface BottomNavContextType {
  isVisible: boolean
  setVisible: (visible: boolean) => void
}

const BottomNavContext = createContext<BottomNavContextType | undefined>(undefined)

export function BottomNavProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setVisible] = useState(true)

  const value = useMemo(() => ({
    isVisible,
    setVisible
  }), [isVisible])

  return (
    <BottomNavContext.Provider value={value}>
      {children}
    </BottomNavContext.Provider>
  )
}

export function useBottomNav() {
  const context = useContext(BottomNavContext)
  if (context === undefined) {
    throw new Error('useBottomNav must be used within a BottomNavProvider')
  }
  return context
}
