import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type SecurityEventType = 
  | 'login' 
  | 'logout' 
  | 'password_change' 
  | 'profile_update' 
  | 'preferences_update' 
  | 'document_upload'
  | 'document_view'
  | 'document_delete'

export async function logSecurityEvent(
  parentId: string,
  eventType: SecurityEventType,
  details?: string,
  metadata: Record<string, any> = {}
) {
  const supabase = await createClient()
  const head = await headers()
  
  const ip = head.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const city = head.get('x-vercel-ip-city')
  const country = head.get('x-vercel-ip-country')
  const region = city && country ? `${city}, ${country}` : country || 'unknown'
  const ua = head.get('user-agent') || 'unknown'

  await supabase.from('parent_security_events').insert({
    parent_id: parentId,
    event_type: eventType,
    details,
    metadata,
    ip_address: ip,
    region,
    user_agent: ua
  })
}
