import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register Your ECD - CentreConnect',
  description: 'Apply for CentreConnect with clear Starter, Growth, and Pro plans built for ECD owners.',
}

// Keep a single source of truth for the registration wizard to avoid UI drift.
export { default } from '@/app/ecd/register/page'
