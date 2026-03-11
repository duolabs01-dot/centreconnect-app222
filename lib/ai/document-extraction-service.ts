import { randomUUID } from 'crypto'
import { z } from 'zod'
import Tesseract from 'tesseract.js'

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
  return [
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
  ].join('\n')
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
    const base64 = bytes.toString('base64')
    const mimeType = input.file.type || 'image/jpeg'

    const result = await Tesseract.recognize(`data:${mimeType};base64,${base64}`, 'eng', {
      logger: () => {},
    })

    const text = result.data.text
    if (!text || text.trim().length < 5) {
      return {
        success: false,
        message: 'No text detected in image.',
      }
    }

    const extractedFields = extractFieldsFromText(text, input.documentType)

    if (Object.keys(extractedFields).length === 0) {
      return {
        success: false,
        message: 'Could not extract structured fields from text.',
      }
    }

    return {
      success: true,
      message: 'Text extracted via OCR.',
      extraction: {
        documentType: input.documentType,
        fields: extractedFields,
        summary: `OCR extracted ${text.split(/\s+/).length} words from document.`,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
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
  if (bytes.byteLength > 10_000_000) {
    return {
      success: false,
      message: 'Document exceeds 10MB limit for AI extraction.',
    }
  }

  const mimeType = input.file.type || 'image/jpeg'
  const response = await fetch(
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
    }
  )

  if (!response.ok) {
    const details = await response.text()
    const status = response.status
    
    if (status === 429 || details.includes('quota') || details.includes('rate limit')) {
      const fallback = await extractWithTesseract(input)
      if (fallback.success) {
        return {
          ...fallback,
          message: 'AI is busy, continuing with document scan.',
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
    return {
      success: false,
      message: 'AI extraction returned an empty payload.',
    }
  }

  const jsonText = extractFirstJsonObject(rawText)
  if (!jsonText) {
    return {
      success: false,
      message: 'AI extraction did not return valid JSON.',
    }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(jsonText)
  } catch {
    return {
      success: false,
      message: 'Failed to parse AI extraction JSON.',
    }
  }

  const parsed = geminiResponseSchema.safeParse(parsedJson)
  if (!parsed.success) {
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

