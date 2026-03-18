'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { getActiveSessions, revokeSessionById } from '@/lib/session-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Shield, Smartphone, Monitor, Globe, Trash2 } from 'lucide-react'

type SessionInfo = {
  id: string
  device_fingerprint: string
  device_hint: string
  ip_address: string
  user_agent: string
  created_at: string
  last_seen_at: string
}

function getDeviceIcon(hint: string) {
  const lower = hint.toLowerCase()
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return Smartphone
  if (lower.includes('tablet') || lower.includes('ipad')) return Monitor
  return Globe
}

function formatUserAgent(ua: string) {
  // Simple truncation to keep UI clean
  if (ua.length <= 60) return ua
  return ua.slice(0, 57) + '...'
}

export default function SessionsPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set())
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null)

  const isEcdAdmin = profile?.role === 'ecd_admin'

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    setLoading(true)
    getActiveSessions(profile.id)
      .then((data) => {
        if (!cancelled) setSessions(data)
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    // Fetch current session token for comparison
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session?.access_token) {
        setCurrentSessionToken(session.access_token)
      }
    })

    return () => {
      cancelled = true
    }
  }, [profile?.id, supabase])

  async function handleRevoke(sessionId: string) {
    if (!profile?.id) return
    setRevokingIds((prev) => new Set(prev).add(sessionId))
    const ok = await revokeSessionById(profile.id, sessionId)
    if (ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Session revoked')
    } else {
      toast.error('Failed to revoke session')
    }
    setRevokingIds((prev) => {
      const next = new Set(prev)
      next.delete(sessionId)
      return next
    })
  }

  if (!isEcdAdmin) {
    return (
      <div className="p-6 text-center">
        <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">Only ECD Admins can view active sessions.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Active Sessions
        </h1>
        <p className="text-muted-foreground">
          You can be logged in on at most 2 devices. Revoking a session will log that device out immediately.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading sessions...</div>
          </CardContent>
        </Card>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">No active sessions found.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const Icon = getDeviceIcon(session.device_hint)
            // We cannot directly compare tokens because we only store a hash; instead, mark current by last_seen recency and token presence
            const isCurrent = currentSessionToken && session.last_seen_at === sessions[0]?.last_seen_at
            const isRevoking = revokingIds.has(session.id)
            return (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-sm">{session.device_hint}</CardTitle>
                        <CardDescription className="text-xs">
                          {session.ip_address} • Last seen{' '}
                          {formatDistanceToNow(new Date(session.last_seen_at), { addSuffix: true })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && <Badge variant="secondary">Current</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRevoking || !!isCurrent}
                        onClick={() => handleRevoke(session.id)}
                      >
                        {isRevoking ? (
                          <span className="animate-pulse">Revoking...</span>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Revoke
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground break-all">{formatUserAgent(session.user_agent)}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
