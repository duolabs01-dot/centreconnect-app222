'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, ChevronLeft, ChevronRight, Cake, Sparkles, Loader2 } from 'lucide-react'

type CalendarEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  is_public: boolean
  centre_name: string | null
}

type Child = {
  id: string
  first_name: string | null
  last_name: string | null
  date_of_birth: string | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ParentCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Get enrolled children
      const { data: childrenData } = await supabase
        .from('children')
        .select('id, first_name, last_name, date_of_birth')
        .not('parent_id', 'is', null)
        .limit(10)
      
      if (childrenData) {
        setChildren(childrenData)
      }

      // Get public calendar events for enrolled children
      const { data: eventsData } = await supabase
        .from('calendar_events')
        .select('id, title, description, event_date, start_time, end_time, is_public, ecd_centres(name)')
        .eq('is_public', true)
        .gte('event_date', today.toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(50)

      if (eventsData) {
        const mapped = eventsData.map((e: any) => ({
          ...e,
          centre_name: Array.isArray(e.ecd_centres) ? e.ecd_centres[0]?.name : e.ecd_centres?.name
        }))
        setEvents(mapped)
      }
      
      setLoading(false)
    }
    
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function getBirthdaysThisMonth() {
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    
    return children
      .filter(child => {
        if (!child.date_of_birth) return false
        const dobMonth = parseInt(child.date_of_birth.split('-')[1])
        return dobMonth === currentMonth
      })
      .map(child => {
        const parts = child.date_of_birth!.split('-')
        const day = parseInt(parts[2])
        const dobMonth = parseInt(parts[1])
        let year = currentYear
        let birthdayDate = new Date(year, dobMonth - 1, day)
        if (birthdayDate < today) {
          birthdayDate = new Date(year + 1, dobMonth - 1, day)
        }
        return {
          ...child,
          nextBirthday: birthdayDate.toISOString().split('T')[0]
        }
      })
  }

  function getUpcomingEvents() {
    return events.filter(e => {
      const eventDate = new Date(e.event_date)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate >= today
    }).slice(0, 10)
  }

  const birthdaysThisMonth = getBirthdaysThisMonth()
  const upcomingEvents = getUpcomingEvents()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-4 pb-24">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
            <p className="text-sm text-slate-500">Upcoming events and birthdays</p>
          </div>
        </div>

        {children.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Sparkles className="mx-auto h-12 w-12 text-amber-400" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">No children enrolled yet</h2>
            <p className="mt-2 text-slate-600">
              Apply to a centre to see their calendar events here.
            </p>
          </div>
        ) : (
          <>
            {/* Birthdays This Month */}
            {birthdaysThisMonth.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Cake className="h-5 w-5 text-amber-600" />
                  <h2 className="text-lg font-bold text-amber-800">Birthdays This Month</h2>
                </div>
                <div className="space-y-2">
                  {birthdaysThisMonth.map(child => (
                    <div key={child.id} className="flex items-center justify-between rounded-xl bg-white p-3">
                      <div>
                        <p className="font-bold text-slate-900">{child.first_name} {child.last_name}</p>
                        <p className="text-sm text-slate-500">{child.date_of_birth}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                        {child.nextBirthday?.split('-')[2]} {MONTHS[parseInt(child.nextBirthday!.split('-')[1]) - 1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Events</h2>
              
              {upcomingEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="flex flex-col items-center rounded-lg bg-teal-100 px-3 py-2 text-center min-w-[60px]">
                        <span className="text-xs font-bold text-teal-600">
                          {MONTHS[parseInt(event.event_date.split('-')[1]) - 1].slice(0, 3)}
                        </span>
                        <span className="text-lg font-black text-teal-700">
                          {event.event_date.split('-')[2]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-slate-500 line-clamp-2">{event.description}</p>
                        )}
                        {event.centre_name && (
                          <p className="text-xs text-teal-600 mt-1">{event.centre_name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
