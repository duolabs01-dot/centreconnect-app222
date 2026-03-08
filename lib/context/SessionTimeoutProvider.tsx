'use client'

import React, { createContext, useContext } from 'react'

interface SessionTimeoutContextType {}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined)

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  return <SessionTimeoutContext.Provider value={{}}>{children}</SessionTimeoutContext.Provider>
}

export function useSessionTimeout() {
  const context = useContext(SessionTimeoutContext)
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider')
  }
  return context
}
