import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { z } from 'zod'
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai'
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

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

function getGeminiClient(apiKey: string) {
  return new GoogleGenAI({ apiKey })
}

function getFileState(file: { state?: string | { name?: string } } | null | undefined) {
  if (!file?.state) return null
  return typeof file.state === 'string' ? file.state : file.state.name ?? null
}

function getTempUploadPath(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const tempRoot = process.env.TMPDIR || process.env.TEMP || process.env.TMP || os.tmpdir()
  return path.resolve(tempRoot, 'centreconnect', 'gemini-uploads', `${Date.now()}-${randomUUID()}.${extension}`)
}

async function waitForGeminiFileActive(filesService: any, name: string) {
  let uploaded = await filesService.get({ name })
  while (getFileState(uploaded) !== 'ACTIVE') {
    if (getFileState(uploaded) === 'FAILED') {
      throw new Error(`Gemini file ${name} failed to activate.`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
    uploaded = await filesService.get({ name })
  }
  return uploaded
}

async function runGeminiSdkExtraction(input: { file: File; documentType: AiDocumentType }, apiKey: string) {
  const client = getGeminiClient(apiKey)
  const mimeType = input.file.type || 'image/jpeg'
  const tempPath = getTempUploadPath(input.file)

  await fs.mkdir(path.dirname(tempPath), { recursive: true })
  await fs.writeFile(tempPath, Buffer.from(await input.file.arrayBuffer()))

  try {
    const uploaded = await client.files.upload({
      file: tempPath,
      config: { mimeType },
    })

    if (!uploaded.name) {
      throw new Error('Gemini upload did not return a file name.')
    }

    const readyFile =
      getFileState(uploaded as { state?: string | { name?: string } }) === 'ACTIVE'
        ? uploaded
        : await waitForGeminiFileActive(client.files, uploaded.name)

    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        createUserContent([
          buildPrompt(input.documentType),
          createPartFromUri(readyFile.uri, readyFile.mimeType ?? mimeType),
        ]),
      ],
    })

    return response.text?.trim() ?? ''
  } finally {
    await fs.unlink(tempPath).catch(() => {})
  }
}

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

export async function extractStructuredDocumentWithGemini(input: {
  file: File
  documentType: AiDocumentType
}): Promise<AiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return {
      success: false,
      message: 'AI extraction is not configured.',
    }
  }

  const bytes = Buffer.from(await input.file.arrayBuffer())
  if (bytes.byteLength > ATTENDANCE_IMPORT_MAX_FILE_BYTES) {
    return {
      success: false,
      message: `Document exceeds ${ATTENDANCE_IMPORT_MAX_FILE_MB}MB limit for AI extraction.`,
    }
  }

  try {
    const rawText = await runGeminiSdkExtraction(input, apiKey)
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
  } catch (error) {
    return {
      success: false,
      message: `AI extraction request failed before response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
