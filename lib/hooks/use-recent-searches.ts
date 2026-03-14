'use client'

import { useCallback, useEffect, useState } from 'react'

const RECENT_SEARCHES_KEY = 'cc_recent_searches'
const RECENT_SUBURBS_KEY = 'cc_recent_suburbs'
const MAX_RECENT_SEARCHES = 5
const MAX_RECENT_SUBURBS = 3

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [recentSuburbs, setRecentSuburbs] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      const searches = localStorage.getItem(RECENT_SEARCHES_KEY)
      const suburbs = localStorage.getItem(RECENT_SUBURBS_KEY)
      
      if (searches) setRecentSearches(JSON.parse(searches))
      if (suburbs) setRecentSuburbs(JSON.parse(suburbs))
    } catch (e) {
      console.error('Failed to load recent searches:', e)
    }
    setIsLoaded(true)
  }, [])

  const addRecentSearch = useCallback((search: string) => {
    if (!search.trim() || typeof window === 'undefined') return
    
    const trimmed = search.trim()
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const addRecentSuburb = useCallback((suburb: string) => {
    if (!suburb.trim() || typeof window === 'undefined') return
    
    const trimmed = suburb.trim()
    setRecentSuburbs(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SUBURBS)
      localStorage.setItem(RECENT_SUBURBS_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }, [])

  const clearRecentSuburbs = useCallback(() => {
    setRecentSuburbs([])
    localStorage.removeItem(RECENT_SUBURBS_KEY)
  }, [])

  const clearAll = useCallback(() => {
    clearRecentSearches()
    clearRecentSuburbs()
  }, [clearRecentSearches, clearRecentSuburbs])

  return {
    recentSearches,
    recentSuburbs,
    isLoaded,
    addRecentSearch,
    addRecentSuburb,
    clearRecentSearches,
    clearRecentSuburbs,
    clearAll,
  }
}
