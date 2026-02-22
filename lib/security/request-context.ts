import type { NextRequest } from 'next/server'

export function getClientIp(request: Request | NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

export function getClientAgent(request: Request | NextRequest) {
  return request.headers.get('user-agent')?.trim() || 'unknown'
}
