import { NextResponse } from 'next/server'

export function GET(request: Request) {
  const url = new URL('/centreconnect-logo.svg', request.url)
  return NextResponse.redirect(url, { status: 307 })
}

