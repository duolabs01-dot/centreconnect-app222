import { randomUUID } from 'crypto'
import { z } from 'zod'
import Tesseract from 'tesseract.js'
import sharp from 'sharp'
import { ATTENDANCE_IMPORT_MAX_FILE_BYTES, ATTENDANCE_IMPORT_MAX_FILE_MB } from '@/lib/attendance/imports'

export const AI_DOCUMENT_TYPES = [
  'birth_certificate',
  'medical_card',
  'immunization_record',
  'fire_clearance',
  'health_clearance',
  'staff_qualification',
  'register',
] as const

export type AiDocumentType = (typeof AI_DOCUMENT_TYPES)[number]

const aiDocumentTypeSet = new Set<string>(AI_DOCUMENT_TYPES)

export const AI_FIELD_KEYS = [
  'first_name',
  'last_name',
  'full_name',
  'date_of_birth',
  'expiry_date',
  'allergies',
  'medical_conditions',
  'medications',
  'blood_type',
  'doctor_name',
  'medical_aid_number',
  'emergency_contact_name',
  'emergency_contact_phone',
  'issuing_authority',
  'document_number',
  'record_date',
  'facility_name',
  'qualification_name',
  'notes',
] as const

export type AiFieldKey = (typeof AI_FIELD_KEYS)[number]
export type AiFieldValue = string | string[]

export type AiFieldSuggestion = {
  value: AiFieldValue
  confidence: number
}

export type AiExtractionPayload = {
  documentType: AiDocumentType
  fields: Partial<Record<AiFieldKey, AiFieldSuggestion>>
  summary?: string
}

export type AiExtractionResult = {
  success: boolean
  message: string
  extraction?: AiExtractionPayload
}

export type StorageUploadResult = {
  success: boolean
  message: string
  bucket: 'ecd-media'
  path?: string
  publicUrl?: string
}

type StorageClient = {
  storage: {
    from: (
      bucket: 'ecd-media'
    ) => {
      upload: (
        path: string,
        file: File,
        options?: { upsert?: boolean; contentType?: string }
      ) => Promise<{ error: { message?: string } | null }>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
}

const geminiResponseSchema = z
  .object({
    summary: z.string().optional(),
    fields: z
      .record(
        z.object({
          value: z.union([z.string(), z.array(z.string())]),
          confidence: z.number().optional(),
        })
      )
      .optional(),
  })
  .passthrough()

function normalizeConfidence(input: unknown) {
  const value = typeof input === 'number' ? input : Number.NaN
  if (!Number.isFinite(value)) return 65
  const normalized = value <= 1 ? value * 100 : value
  return Math.max(1, Math.min(100, Math.round(normalized)))
}

function extractFirstJsonObject(raw: string) {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  return raw.slice(start, end + 1)
}

function sanitizeFilename(fileName: string) {
  const normalized = fileName.replace(/[^\w.\-]/g, '_')
  return normalized.length > 96 ? normalized.slice(-96) : normalized
}

function normalizeFieldValue(value: string | string[]): AiFieldValue | undefined {
  if (Array.isArray(value)) {
    const list = value
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 30)
    return list.length > 0 ? list : undefined
  }

  const cleaned = value.trim()
  return cleaned ? cleaned : undefined
}

function buildPrompt(documentType: AiDocumentType) {
  const basePrompt = [
    'You are an OCR and structured extraction engine for ECD documents.',
    `Document type: ${documentType}.`,
    'Return JSON only with this shape:',
    '{',
    '  "summary": "short summary",',
    '  "fields": {',
    '    "field_name": { "value": "<string or string[]>", "confidence": 0.0-1.0 }',
    '  }',
    '}',
    'Only include fields that are present in the document.',
    'Allowed field names:',
    AI_FIELD_KEYS.join(', '),
    'Use ISO dates (YYYY-MM-DD) for date fields when possible.',
    'For allergies/medical_conditions/medications return arrays.',
  ]

  if (documentType === 'register') {
    basePrompt.push(
      'For attendance registers: include every detected child name in fields.full_name as an array of strings.',
      'Do not collapse names into one string and do not return duplicates.',
      'If the page contains a date, store it in fields.record_date.'
    )
  }

  return basePrompt.join('\n')
}

function readGeminiText(response: unknown) {
  const payload = response as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('\n')
      .trim() ?? ''
  )
}

export function isSupportedAiDocumentType(value: string): value is AiDocumentType {
  return aiDocumentTypeSet.has(value)
}

export async function uploadPhotoForAiExtraction(input: {
  supabase: StorageClient
  ecdId: string
  documentType: AiDocumentType
  file: File
  folder?: string
}): Promise<StorageUploadResult> {
  const contentType = input.file.type || 'image/jpeg'
  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeName = sanitizeFilename(input.file.name.replace(/\.[^/.]+$/, ''))
  const folder = input.folder?.trim() || 'general'
  const path = `ecd/${input.ecdId}/ai/${folder}/${input.documentType}/${Date.now()}-${randomUUID()}-${safeName}.${extension}`

  const { error } = await input.supabase.storage.from('ecd-media').upload(path, input.file, {
    upsert: false,
    contentType,
  })

  if (error) {
    return {
      success: false,
      message: error.message || 'Failed to upload photo for AI extraction.',
      bucket: 'ecd-media',
    }
  }

  const {
    data: { publicUrl },
  } = input.supabase.storage.from('ecd-media').getPublicUrl(path)

  return {
    success: true,
    message: 'Photo uploaded.',
    bucket: 'ecd-media',
    path,
    publicUrl,
  }
}

export async function extractWithTesseract(input: {
  file: File
  documentType: AiDocumentType
}): Promise<AiExtractionResult> {
  try {
    const bytes = Buffer.from(await input.file.arrayBuffer())
    const mimeType = input.file.type || 'image/jpeg'

    const variantBuffers: Array<{ label: string; bytes: Buffer }> = [{ label: 'original', bytes }]

    try {
      const enhanced = await sharp(bytes)
        .rotate()
        .grayscale()
        .normalize()
        .modulate({ brightness: 1.12, saturation: 0 })
        .sharpen()
        .resize({ width: 2200, withoutEnlargement: false })
        .jpeg({ quality: 96 })
        .toBuffer()
      variantBuffers.push({ label: 'enhanced', bytes: enhanced })
    } catch {
      // Ignore image preprocessing failure and continue with original bytes.
    }

    let best: {
      label: string
      text: string
      fields: Partial<Record<AiFieldKey, AiFieldSuggestion>>
      score: number
    } | null = null

    for (const variant of variantBuffers) {
      const base64 = variant.bytes.toString('base64')
      const result = await Tesseract.recognize(`data:${mimeType};base64,${base64}`, 'eng', {
        logger: () => {},
      })

      const text = result.data.text?.trim() ?? ''
      if (text.length < 5) continue

      const fields = extractFieldsFromText(text, input.documentType)
      const textWords = text.split(/\s+/).length
      const registerNames = Array.isArray(fields.full_name?.value)
        ? (fields.full_name?.value as string[]).length
        : typeof fields.full_name?.value === 'string'
        ? 1
        : 0

      const score = Object.keys(fields).length * 10 + textWords + registerNames * 25

      if (!best || score > best.score) {
        best = {
          label: variant.label,
          text,
          fields,
          score,
        }
      }
    }

    if (!best) {
      return {
        success: false,
        message: 'No text detected in image.',
      }
    }

    if (Object.keys(best.fields).length === 0) {
      return {
        success: false,
        message: 'Could not extract structured fields from text.',
      }
    }

    return {
      success: true,
      message: best.label === 'enhanced' ? 'Text extracted via OCR (enhanced scan).' : 'Text extracted via OCR.',
      extraction: {
        documentType: input.documentType,
        fields: best.fields,
        summary: `OCR extracted ${best.text.split(/\s+/).length} words from document (${best.label}).`,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

function toTitleCaseName(value: string) {
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function extractRegisterNamesFromText(text: string) {
  const normalizedLines = text
    .split('\n')
    .map((line) => line.replace(/[|•·]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const ignoredWords = new Set([
    'present',
    'absent',
    'late',
    'sick',
    'yes',
    'no',
    'register',
    'attendance',
    'date',
    'class',
    'grade',
    'time',
    'signature',
    'teacher',
    'guardian',
    'notes',
    'total',
    'male',
    'female',
    'boy',
    'girl',
  ])

  const candidates: string[] = []
  for (const line of normalizedLines) {
    const cleaned = line
      .replace(/^\d+[.)\-:\s]+/, '')
      .replace(/^[\W_]+/, '')
      .replace(/[\W_]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleaned) continue
    if (cleaned.length < 3 || cleaned.length > 90) continue

    const words = cleaned.split(' ').filter(Boolean)
    if (words.length < 2 || words.length > 5) continue

    const normalizedWords = words.map((word) => word.replace(/[^A-Za-z'\-]/g, '')).filter(Boolean)
    if (normalizedWords.length < 2) continue

    const looksLikeName = normalizedWords.every((word) => {
      const lower = word.toLowerCase()
      if (ignoredWords.has(lower)) return false
      return /^[A-Za-z][A-Za-z'\-]{1,}$/.test(word)
    })

    if (!looksLikeName) continue
    candidates.push(toTitleCaseName(normalizedWords.join(' ')))
  }

  const unique: string[] = []
  const seen = new Set<string>()
  for (const name of candidates) {
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(name)
  }

  return unique.slice(0, 40)
}

function extractRecordDateFromText(text: string) {
  const isoLike = text.match(/\b(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})\b/)
  if (isoLike) {
    const [year, month, day] = isoLike[1].split(/[\/-]/)
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const dayFirst = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\b/)
  if (dayFirst) {
    const day = dayFirst[1].padStart(2, '0')
    const month = dayFirst[2].padStart(2, '0')
    const year = dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3]
    return `${year}-${month}-${day}`
  }

  return null
}

function extractFieldsFromText(
  text: string,
  documentType: AiDocumentType
): Partial<Record<AiFieldKey, AiFieldSuggestion>> {
  const fields: Partial<Record<AiFieldKey, AiFieldSuggestion>> = {}
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const nameMatch = text.match(/(?:name|first.?name|full.?name)[:\s]+([a-zA-Z]+)/i)
  if (nameMatch) {
    fields.first_name = { value: nameMatch[1], confidence: 50 }
  }

  const surnameMatch = text.match(/(?:surname|last.?name|family.?name)[:\s]+([a-zA-Z]+)/i)
  if (surnameMatch) {
    fields.last_name = { value: surnameMatch[1], confidence: 50 }
  }

  const dobMatch = text.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/)
  if (dobMatch) {
    fields.date_of_birth = { value: dobMatch[1], confidence: 60 }
  }

  const docNumMatch = text.match(/(?:number|id|ref|registration)[:\s]*([A-Z0-9]{5,})/i)
  if (docNumMatch) {
    fields.document_number = { value: docNumMatch[1], confidence: 40 }
  }

  const dateMatch = text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/)
  if (dateMatch) {
    fields.record_date = { value: dateMatch[1], confidence: 40 }
  }

  const notes = lines.slice(0, 3).join(' ').slice(0, 200)
  if (notes) {
    fields.notes = { value: notes, confidence: 30 }
  }

  if (documentType === 'register') {
    const names = extractRegisterNamesFromText(text)
    if (names.length > 0) {
      fields.full_name = { value: names, confidence: 65 }
    }

    const recordDate = extractRecordDateFromText(text)
    if (recordDate) {
      fields.record_date = { value: recordDate, confidence: 55 }
    }
  }

  return fields
}

export async function extractStructuredDocumentWithGemini(input: {
  file: File
  documentType: AiDocumentType
}): Promise<AiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return await extractWithTesseract(input)
  }

  const bytes = Buffer.from(await input.file.arrayBuffer())
  if (bytes.byteLength > ATTENDANCE_IMPORT_MAX_FILE_BYTES) {
    return {
      success: false,
      message: `Document exceeds ${ATTENDANCE_IMPORT_MAX_FILE_MB}MB limit for AI extraction.`,
    }
  }

  const mimeType = input.file.type || 'image/jpeg'
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: buildPrompt(input.documentType) },
                {
                  inlineData: {
                    mimeType,
                    data: bytes.toString('base64'),
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 1600,
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    )
  } catch (error) {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI timed out. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: `AI extraction request failed before response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }

  if (!response.ok) {
    const details = await response.text()
    const status = response.status
    
    if (status === 429 || details.includes('quota') || details.includes('rate limit')) {
      const fallback = await extractWithTesseract(input)
      if (fallback.success) {
        return {
          ...fallback,
          message: 'AI is busy. We tried a basic document scan instead.',
        }
      }
      return fallback
    }
    
    return {
      success: false,
      message: `AI extraction request failed (${status}): ${details.slice(0, 220)}`,
    }
  }

  const rawPayload = (await response.json()) as unknown
  const rawText = readGeminiText(rawPayload)
  if (!rawText) {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI returned an empty response. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: 'AI extraction returned an empty payload.',
    }
  }

  const jsonText = extractFirstJsonObject(rawText)
  if (!jsonText) {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI response format was invalid. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: 'AI extraction did not return valid JSON.',
    }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(jsonText)
  } catch {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI JSON could not be parsed. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: 'Failed to parse AI extraction JSON.',
    }
  }

  const parsed = geminiResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI response schema was unexpected. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: 'AI extraction response schema did not match expected format.',
    }
  }

  const allowedKeys = new Set<string>(AI_FIELD_KEYS)
  const fields: Partial<Record<AiFieldKey, AiFieldSuggestion>> = {}

  for (const [key, entry] of Object.entries(parsed.data.fields ?? {})) {
    if (!allowedKeys.has(key)) continue

    const normalizedValue = normalizeFieldValue(entry.value)
    if (!normalizedValue) continue

    fields[key as AiFieldKey] = {
      value: normalizedValue,
      confidence: normalizeConfidence(entry.confidence),
    }
  }

  if (Object.keys(fields).length === 0) {
    const fallback = await extractWithTesseract(input)
    if (fallback.success) {
      return {
        ...fallback,
        message: 'AI could not confidently extract fields. We used a basic document scan instead.',
      }
    }
    return {
      success: false,
      message: 'AI could not confidently extract structured fields from this image.',
    }
  }

  return {
    success: true,
    message: 'AI extraction complete.',
    extraction: {
      documentType: input.documentType,
      fields,
      summary: parsed.data.summary?.trim() || undefined,
    },
  }
}
