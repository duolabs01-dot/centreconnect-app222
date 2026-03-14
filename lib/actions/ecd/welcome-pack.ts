'use server'

import { sendSmtpMail } from '@/lib/email/smtp'
import { renderBaseEmailLayout } from '@/lib/email/email-layout'
import { createAdminClient } from '@/lib/supabase/admin'

type SendFeaturesAnnouncementInput = {
  ecdId: string
}

type SendFeaturesAnnouncementResult = {
  success: boolean
  message: string
  messageId?: string
}

export async function sendNewFeaturesAnnouncement(input: SendFeaturesAnnouncementInput): Promise<SendFeaturesAnnouncementResult> {
  const supabaseAdmin = createAdminClient()

  const { data: centre, error: centreError } = await supabaseAdmin
    .from('ecd_centres')
    .select('id, name, slug, primary_contact_email, email, owner_id, phone, address, suburb')
    .eq('id', input.ecdId)
    .maybeSingle()

  if (centreError || !centre) {
    return { success: false, message: 'Centre not found' }
  }

  const recipientEmail = centre.primary_contact_email || centre.email
  if (!recipientEmail) {
    return { success: false, message: 'No email address found for this centre' }
  }

  const centreName = centre.name || 'Your Creche'
  const loginUrl = `https://centerconnect.co.za/ecd/login?centre=${centre.slug}`

  const { html, text } = renderBaseEmailLayout({
    theme: 'ecd',
    recipientName: centreName,
    previewText: 'New ways to save time and keep parents happy — now live in your dashboard.',
    heading: 'New in Your Creche Toolkit',
    subheading: 'Smart features to make your daily run smoother.',
    children: `
      <p>Hi there!</p>
      
      <p>We have been working on ways to make your life easier — and we think you will love these.</p>
      
      <h3 style="margin:28px 0 12px;font-size:18px;font-weight:800;color:#0d9488;">⏱️ Paper Register → Digital, in Minutes</h3>
      <p style="margin:0 0 16px;">Simply upload your existing attendance list and we will set everything up for you. No typing every child's name. No manual entry. Just upload and go.</p>
      
      <h3 style="margin:28px 0 12px;font-size:18px;font-weight:800;color:#0d9488;">📑 DSD Pack with One Click</h3>
      <p style="margin:0 0 16px;">The Department of Social Development forms you need — automatically populated from your child records. Generate, download, done.</p>
      
      <h3 style="margin:28px 0 12px;font-size:18px;font-weight:800;color:#0d9488;">📸 Daily Updates Parents Actually Open</h3>
      <p style="margin:0 0 16px;">Send photos, meals, and activities straight to parents. Less WhatsApp chaos, more trust built.</p>
      
      <h3 style="margin:28px 0 12px;font-size:18px;font-weight:800;color:#0d9488;">🔐 Pickup That Gives Peace of Mind</h3>
      <p style="margin:0 0 28px;">Replace the paper collection book with secure PIN-based pickup. Know exactly who is collecting — and when.</p>
      
      <div style="margin:32px 0;text-align:center;">
        <a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:800;padding:16px 32px;border-radius:16px;font-size:16px;">Try One of These Now</a>
      </div>
      
      <p style="margin:28px 0 0;font-size:14px;color:#64748b;">Every feature here was built to save you time and help parents feel connected. If there is something you need — just reply and tell us.</p>
      
      <p style="margin:24px 0 0;font-size:14px;color:#64748b;">With warmth,<br/>The CentreConnect Team</p>
    `,
  })

  const result = await sendSmtpMail({
    to: [recipientEmail],
    subject: 'New in Your Creche Toolkit — Features to Save You Time',
    text,
    html,
  })

  if (!result.ok) {
    return { success: false, message: `Failed to send email: ${result.error}` }
  }

  return {
    success: true,
    message: `Features announcement sent to ${centreName} at ${recipientEmail}`,
    messageId: result.messageId ?? undefined,
  }
}

export async function sendFeaturesToPilotCentres(): Promise<{ success: boolean; results: SendFeaturesAnnouncementResult[] }> {
  const supabaseAdmin = createAdminClient()

  const { data: centres, error } = await supabaseAdmin
    .from('ecd_centres')
    .select('id, name, slug, primary_contact_email, email, is_pilot, is_claimed')
    .eq('is_pilot', true)
    .eq('is_claimed', true)
    .or('name.ilike.%bajabulile%,name.ilike.%sakhisizwe%')

  if (error || !centres || centres.length === 0) {
    return {
      success: false,
      results: [{ success: false, message: 'No pilot centres found' }],
    }
  }

  const results: SendFeaturesAnnouncementResult[] = []

  for (const centre of centres) {
    const result = await sendNewFeaturesAnnouncement({ ecdId: centre.id })
    results.push(result)
  }

  const allSucceeded = results.every((r) => r.success)

  return {
    success: allSucceeded,
    results,
  }
}
