// lib/communications/emails.ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function queueEmail(recipient: string, subject: string, body: string) {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from('email_queue')
    .insert({
      recipient,
      subject,
      body,
      status: 'pending',
    })
    .select()

  if (error) {
    console.error('Error queuing email:', error.message)
    return { success: false, error: error.message }
  }


  return { success: true, data }
}
