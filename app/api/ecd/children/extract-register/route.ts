import { NextResponse } from 'next/server'

import {
  extractStructuredDocumentWithGemini,
  type AiExtractionPayload,
  type AiFieldKey,
} from '@/lib/ai/document-extraction-service'
import { getEcdPortalSession } from '@/lib/ecd/portal-session'

type ExistingChildBulkDraft = {
  full_name: string
  enrollment_start_date: string
  date_of_birth?: string
  confidence?: number
}

function rejectAfter(ms: number, reason: string) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(reason)), ms)
  })
}

function formatErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.trim()
    return message || fallback
  }
  if (typeof error === 'string') {
    const message = error.trim()
    return message || fallback
  }
  return fallback
}

function normalizeDateString(raw: string | undefined) {
  if (!raw) return undefined
  const value = raw.trim()
  if (!value) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const ddmmyyyy = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    return `${yyyy}-${mm}-${dd}`
  }

  return undefined
}

function getFieldString(extraction: AiExtractionPayload, key: AiFieldKey) {
  const value = extraction.fields[key]?.value
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned || undefined
}

function getFieldConfidence(extraction: AiExtractionPayload, key: AiFieldKey) {
  return extraction.fields[key]?.confidence
}

function splitPossibleNames(input: string) {
  return input
    .split(/\r?\n|,|;|\|/g)
    .map((entry) => entry.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function extractNumberedNameCandidates(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d{1,3}[\).:\-\s]+/, '').trim())
    .filter((line) => line.length >= 2)
    .filter((line) => /[A-Za-z]/.test(line))
}

function normalizeCandidateName(value: string) {
  return value
    .replace(/^\s*\d{1,3}[\).:\-\s]+/, '')
    .replace(/[|â€¢Â·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseRegisterNames(extraction: AiExtractionPayload) {
  const fullNameValue = extraction.fields.full_name?.value
  const fromArray = Array.isArray(fullNameValue) ? fullNameValue : []
  const fromString = typeof fullNameValue === 'string' ? splitPossibleNames(fullNameValue) : []
  const firstName = getFieldString(extraction, 'first_name')
  const lastName = getFieldString(extraction, 'last_name')
  const mergedSingle = [firstName, lastName].filter(Boolean).join(' ').trim()

  const banned = new Set(['present', 'absent', 'late', 'sick', 'attendance', 'register', 'date', 'class', 'total'])

  const notesText = getFieldString(extraction, 'notes') ?? ''
  const numberedCandidates = extractNumberedNameCandidates(
    [typeof fullNameValue === 'string' ? fullNameValue : '', notesText].join('\n')
  )

  const cleanedCandidates = [...fromArray, ...fromString, mergedSingle, ...numberedCandidates]
    .map((name) => normalizeCandidateName(name))
    .filter((name) => name.length >= 2)

  const strict = cleanedCandidates.filter((name) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length < 1 || parts.length > 5) return false
    return parts.every((part) => {
      const normalized = part.replace(/[^A-Za-z'-]/g, '')
      if (!normalized) return false
      if (banned.has(normalized.toLowerCase())) return false
      return /^[A-Za-z][A-Za-z'-]+$/.test(normalized)
    })
  })

  const relaxed = cleanedCandidates.filter((name) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length < 1 || parts.length > 6) return false
    const alphaCount = parts.filter((part) => /[A-Za-z]/.test(part)).length
    if (alphaCount === 0) return false
    return !parts.some((part) => banned.has(part.toLowerCase()))
  })

  const all = strict.length > 0 ? strict : relaxed
  const unique: string[] = []
  const seen = new Set<string>()

  for (const name of all) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(name)
  }

  return unique.slice(0, 200)
}

export async function POST(request: Request) {
  let stage = 'session'
  try {
    const session = await getEcdPortalSession()
    if (!session?.ecdId) {
      return NextResponse.json({ success: false, message: 'ECD session not found.' }, { status: 401 })
    }

    stage = 'form-data'
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Upload a register photo first.' }, { status: 400 })
    }

    const fallbackStartDate = normalizeDateString(String(formData.get('default_start_date') ?? '').trim())

    stage = 'gemini-extraction'
    const extractionResult = await Promise.race([
      extractStructuredDocumentWithGemini({
        file,
        documentType: 'register',
      }),
      rejectAfter(30000, 'Gemini extraction timed out after 30 seconds.'),
    ])

    const extractionPayload = extractionResult?.success ? extractionResult.extraction : null
    const names = extractionPayload ? parseRegisterNames(extractionPayload) : []

    stage = 'parse-extraction'
    if (!extractionPayload) {
      return NextResponse.json(
        {
          success: false,
          message: extractionResult?.message || 'Gemini could not extract readable names from this photo.',
        },
        { status: 200 }
      )
    }

    stage = 'parse-names'
    if (names.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not detect child names from this photo. Try a clearer image or use CSV import.',
        },
        { status: 200 }
      )
    }

    stage = 'build-response'
    const suggestedStartDate =
      normalizeDateString(getFieldString(extractionPayload, 'record_date')) ??
      fallbackStartDate ??
      new Date().toISOString().slice(0, 10)
    const confidence =
      getFieldConfidence(extractionPayload, 'full_name') ??
      getFieldConfidence(extractionPayload, 'first_name') ??
      65

    const drafts: ExistingChildBulkDraft[] = names.map((name) => ({
      full_name: name,
      enrollment_start_date: suggestedStartDate,
      confidence,
    }))

    return NextResponse.json({
      success: true,
      message: `Extracted ${drafts.length} child name${drafts.length === 1 ? '' : 's'}. Review and save.`,
      drafts,
      summary: extractionPayload.summary || extractionResult?.message,
    })
  } catch (error) {
    const detail = formatErrorMessage(error, 'Unknown route error')
    console.error('[children] extract-register route failed', { stage, error })
    return NextResponse.json(
      {
        success: false,
        message: `Extraction failed during ${stage}: ${detail}`,
      },
      { status: 500 }
    )
  }
}

