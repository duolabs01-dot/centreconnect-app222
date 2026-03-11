import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://upaezyiijeqkjepppzze.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwYWV6eWlpamVxa2plcHBwenplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTg0OTgsImV4cCI6MjA4Njc5NDQ5OH0.5iiWO_I7dfrvbHFZD4ulUQ87dWGOYSI1Npnm0ZNFtzg'

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
