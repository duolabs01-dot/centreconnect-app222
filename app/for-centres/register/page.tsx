import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register Your ECD - CentreConnect',
  description: 'Apply for a CentreConnect ECD workspace with Pilot, Basic, Standard or Premium options.',
}

// Keep a single source of truth for the registration wizard to avoid UI drift.
export { default } from '@/app/ecd/register/page'
