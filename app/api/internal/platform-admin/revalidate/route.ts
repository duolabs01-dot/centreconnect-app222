import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/auth/platform-admin'

export async function POST(request: Request) {
  const identity = await requirePlatformAdmin(request)
  if (!identity) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  const paths = Array.isArray(payload?.paths) ? payload.paths.filter(Boolean) : []
  if (paths.length === 0) {
    return NextResponse.json({ error: 'No paths provided' }, { status: 400 })
  }

  try {
    for (const path of paths) {
      revalidatePath(path)
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to revalidate path' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
