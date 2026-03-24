import { redirect } from 'next/navigation'

// Announcements live in Communications — one home for all messaging
export default function AnnouncementsRedirectPage() {
  redirect('/ecd/communications')
}
