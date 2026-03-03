import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const redirectUrl = new URL('/auth/confirm', request.url)

  for (const [key, value] of url.searchParams.entries()) {
    redirectUrl.searchParams.append(key, value)
  }

  return NextResponse.redirect(redirectUrl)
}

