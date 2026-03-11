'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, ChevronLeft, ChevronRight, Cake, Sparkles, Loader2, Share2, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

const CHILD_RELEVANT_KEYWORDS = [
  'birthday', 'birth day', 'bday',
  'open day', 'open day',
  'start day', 'starting day', 'first day',
  'closing', 'closure', 'close day',
  'graduation', 'grad', 'graduation day', 'ceremony',
  'parent', 'parents', 'meeting',
  'performance', 'show', 'concert',
  'sports day', 'field day',
  'excursion', 'trip', 'outings',
]

function isChildRelevantEvent(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  return CHILD_RELEVANT_KEYWORDS.some(keyword => lowerTitle.includes(keyword.toLowerCase()))
}

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
    return events
      .filter(e => {
        if (!isChildRelevantEvent(e.title)) return false
        const eventDate = new Date(e.event_date)
        eventDate.setHours(0, 0, 0, 0)
        return eventDate >= today
      })
      .slice(0, 10)
  }

  const birthdaysThisMonth = getBirthdaysThisMonth()
  const upcomingEvents = getUpcomingEvents()

  function generateICS(event: CalendarEvent) {
    const startDate = event.event_date.replace(/-/g, '')
    const endDate = event.event_date.replace(/-/g, '')
    const startTime = event.start_time ? event.start_time.replace(/:/g, '') + '00' : '090000'
    const endTime = event.end_time ? event.end_time.replace(/:/g, '') + '00' : '100000'
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CentreConnect//Calendar//EN
BEGIN:VEVENT
UID:${event.id}@centreconnect.co.za
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDate}T${startTime}
DTEND:${endDate}T${endTime}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.centre_name || ''}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/\s+/g, '-')}.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

  function shareOnWhatsApp(event: CalendarEvent) {
    const date = new Date(event.event_date).toLocaleDateString('en-ZA', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const message = `*${event.title}*\n📅 ${date}\n${event.centre_name ? `🏫 ${event.centre_name}\n` : ''}${event.description ? `\n${event.description}` : ''}\n\nFrom CentreConnect`
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  function addBirthdayToCalendar(child: { first_name: string | null; last_name: string | null; nextBirthday: string }) {
    const date = child.nextBirthday.replace(/-/g, '')
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CentreConnect//Birthday//EN
BEGIN:VEVENT
UID:birthday-${child.nextBirthday}@centreconnect.co.za
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${date}
SUMMARY:🎂 ${child.first_name}'s Birthday
DESCRIPTION:Don't forget to wish ${child.first_name} a happy birthday!
RRULE:FREQ=YEARLY
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${child.first_name}-birthday.ics`
    link.click()
    URL.revokeObjectURL(url)
  }

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
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                          {child.nextBirthday?.split('-')[2]} {MONTHS[parseInt(child.nextBirthday!.split('-')[1]) - 1]}
                        </span>
                        <button 
                          onClick={() => addBirthdayToCalendar(child)}
                          className="rounded-full bg-teal-100 p-2 text-teal-600 hover:bg-teal-200"
                          title="Add birthday to phone calendar"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </button>
                      </div>
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
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => generateICS(event)}
                          className="rounded-full bg-white p-2 text-slate-500 hover:bg-teal-100 hover:text-teal-600"
                          title="Add to phone calendar"
                        >
                          <CalendarPlus className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => shareOnWhatsApp(event)}
                          className="rounded-full bg-green-100 p-2 text-green-600 hover:bg-green-200"
                          title="Share on WhatsApp"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
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
