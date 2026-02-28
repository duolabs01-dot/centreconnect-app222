import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')?.trim().toLowerCase()

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }

  // Validate format
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ 
      available: false, 
      error: 'Username must be 3-20 characters and contain only letters, numbers, or underscores' 
    })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ 
      available: !data,
      message: data ? 'Username is taken' : 'Username is available'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
