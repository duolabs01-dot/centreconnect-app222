import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const welcomePilotPath = join(process.cwd(), 'welcome_pilot.html')
const welcomePilotHtml = readFileSync(welcomePilotPath, 'utf-8')

export async function GET() {
  return new NextResponse(welcomePilotHtml, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}
