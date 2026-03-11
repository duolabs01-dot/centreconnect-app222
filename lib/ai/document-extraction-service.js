"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_FIELD_KEYS = exports.AI_DOCUMENT_TYPES = void 0;
exports.isSupportedAiDocumentType = isSupportedAiDocumentType;
exports.uploadPhotoForAiExtraction = uploadPhotoForAiExtraction;
exports.extractWithTesseract = extractWithTesseract;
exports.extractStructuredDocumentWithGemini = extractStructuredDocumentWithGemini;
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const Tesseract = require("tesseract.js");
exports.AI_DOCUMENT_TYPES = [
    'birth_certificate',
    'medical_card',
    'immunization_record',
    'fire_clearance',
    'health_clearance',
    'staff_qualification',
    'register',
];
const aiDocumentTypeSet = new Set(exports.AI_DOCUMENT_TYPES);
exports.AI_FIELD_KEYS = [
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
];
const geminiResponseSchema = zod_1.z
    .object({
    summary: zod_1.z.string().optional(),
    fields: zod_1.z
        .record(zod_1.z.object({
        value: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]),
        confidence: zod_1.z.number().optional(),
    }))
        .optional(),
})
    .passthrough();
function normalizeConfidence(input) {
    const value = typeof input === 'number' ? input : Number.NaN;
    if (!Number.isFinite(value))
        return 65;
    const normalized = value <= 1 ? value * 100 : value;
    return Math.max(1, Math.min(100, Math.round(normalized)));
}
function extractFirstJsonObject(raw) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start)
        return null;
    return raw.slice(start, end + 1);
}
function sanitizeFilename(fileName) {
    const normalized = fileName.replace(/[^\w.\-]/g, '_');
    return normalized.length > 96 ? normalized.slice(-96) : normalized;
}
function normalizeFieldValue(value) {
    if (Array.isArray(value)) {
        const list = value
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 30);
        return list.length > 0 ? list : undefined;
    }
    const cleaned = value.trim();
    return cleaned ? cleaned : undefined;
}
function buildPrompt(documentType) {
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
        exports.AI_FIELD_KEYS.join(', '),
        'Use ISO dates (YYYY-MM-DD) for date fields when possible.',
        'For allergies/medical_conditions/medications return arrays.',
    ].join('\n');
}
function readGeminiText(response) {
    var _a, _b, _c, _d, _e;
    const payload = response;
    return ((_e = (_d = (_c = (_b = (_a = payload.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.map((part) => { var _a; return (_a = part.text) !== null && _a !== void 0 ? _a : ''; }).join('\n').trim()) !== null && _e !== void 0 ? _e : '');
}
function isSupportedAiDocumentType(value) {
    return aiDocumentTypeSet.has(value);
}
async function uploadPhotoForAiExtraction(input) {
    var _a, _b;
    const contentType = input.file.type || 'image/jpeg';
    const extension = ((_a = input.file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'jpg';
    const safeName = sanitizeFilename(input.file.name.replace(/\.[^/.]+$/, ''));
    const folder = ((_b = input.folder) === null || _b === void 0 ? void 0 : _b.trim()) || 'general';
    const path = `ecd/${input.ecdId}/ai/${folder}/${input.documentType}/${Date.now()}-${(0, crypto_1.randomUUID)()}-${safeName}.${extension}`;
    const { error } = await input.supabase.storage.from('ecd-media').upload(path, input.file, {
        upsert: false,
        contentType,
    });
    if (error) {
        return {
            success: false,
            message: error.message || 'Failed to upload photo for AI extraction.',
            bucket: 'ecd-media',
        };
    }
    const { data: { publicUrl }, } = input.supabase.storage.from('ecd-media').getPublicUrl(path);
    return {
        success: true,
        message: 'Photo uploaded.',
        bucket: 'ecd-media',
        path,
        publicUrl,
    };
}
async function extractWithTesseract(input) {
    try {
        const bytes = Buffer.from(await input.file.arrayBuffer());
        const base64 = bytes.toString('base64');
        const mimeType = input.file.type || 'image/jpeg';
        const result = await Tesseract.recognize(`data:${mimeType};base64,${base64}`, 'eng', {
            logger: () => { },
        });
        const text = result.data.text;
        if (!text || text.trim().length < 5) {
            return {
                success: false,
                message: 'No text detected in image.',
            };
        }
        const extractedFields = extractFieldsFromText(text, input.documentType);
        if (Object.keys(extractedFields).length === 0) {
            return {
                success: false,
                message: 'Could not extract structured fields from text.',
            };
        }
        return {
            success: true,
            message: 'Text extracted via OCR.',
            extraction: {
                documentType: input.documentType,
                fields: extractedFields,
                summary: `OCR extracted ${text.split(/\s+/).length} words from document.`,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
function extractFieldsFromText(text, documentType) {
    const fields = {};
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const nameMatch = text.match(/(?:name|first.?name|full.?name)[:\s]+([a-zA-Z]+)/i);
    if (nameMatch) {
        fields.first_name = { value: nameMatch[1], confidence: 50 };
    }
    const surnameMatch = text.match(/(?:surname|last.?name|family.?name)[:\s]+([a-zA-Z]+)/i);
    if (surnameMatch) {
        fields.last_name = { value: surnameMatch[1], confidence: 50 };
    }
    const dobMatch = text.match(/(\d{4}[-\/]\d{2}[-\/]\d{2})/);
    if (dobMatch) {
        fields.date_of_birth = { value: dobMatch[1], confidence: 60 };
    }
    const docNumMatch = text.match(/(?:number|id|ref|registration)[:\s]*([A-Z0-9]{5,})/i);
    if (docNumMatch) {
        fields.document_number = { value: docNumMatch[1], confidence: 40 };
    }
    const dateMatch = text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);
    if (dateMatch) {
        fields.record_date = { value: dateMatch[1], confidence: 40 };
    }
    const notes = lines.slice(0, 3).join(' ').slice(0, 200);
    if (notes) {
        fields.notes = { value: notes, confidence: 30 };
    }
    return fields;
}
async function extractStructuredDocumentWithGemini(input) {
    var _a, _b, _c;
    const apiKey = (_a = process.env.GEMINI_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey) {
        return await extractWithTesseract(input);
    }
    const bytes = Buffer.from(await input.file.arrayBuffer());
    if (bytes.byteLength > 10000000) {
        return {
            success: false,
            message: 'Document exceeds 10MB limit for AI extraction.',
        };
    }
    const mimeType = input.file.type || 'image/jpeg';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`, {
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
    });
    if (!response.ok) {
        const details = await response.text();
        const status = response.status;
        if (status === 429 || details.includes('quota') || details.includes('rate limit')) {
            const fallback = await extractWithTesseract(input);
            if (fallback.success) {
                return Object.assign(Object.assign({}, fallback), { message: 'AI is busy, continuing with document scan.' });
            }
            return fallback;
        }
        return {
            success: false,
            message: `AI extraction request failed (${status}): ${details.slice(0, 220)}`,
        };
    }
    const rawPayload = (await response.json());
    const rawText = readGeminiText(rawPayload);
    if (!rawText) {
        return {
            success: false,
            message: 'AI extraction returned an empty payload.',
        };
    }
    const jsonText = extractFirstJsonObject(rawText);
    if (!jsonText) {
        return {
            success: false,
            message: 'AI extraction did not return valid JSON.',
        };
    }
    let parsedJson;
    try {
        parsedJson = JSON.parse(jsonText);
    }
    catch (_d) {
        return {
            success: false,
            message: 'Failed to parse AI extraction JSON.',
        };
    }
    const parsed = geminiResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
        return {
            success: false,
            message: 'AI extraction response schema did not match expected format.',
        };
    }
    const allowedKeys = new Set(exports.AI_FIELD_KEYS);
    const fields = {};
    for (const [key, entry] of Object.entries((_b = parsed.data.fields) !== null && _b !== void 0 ? _b : {})) {
        if (!allowedKeys.has(key))
            continue;
        const normalizedValue = normalizeFieldValue(entry.value);
        if (!normalizedValue)
            continue;
        fields[key] = {
            value: normalizedValue,
            confidence: normalizeConfidence(entry.confidence),
        };
    }
    if (Object.keys(fields).length === 0) {
        return {
            success: false,
            message: 'AI could not confidently extract structured fields from this image.',
        };
    }
    return {
        success: true,
        message: 'AI extraction complete.',
        extraction: {
            documentType: input.documentType,
            fields,
            summary: ((_c = parsed.data.summary) === null || _c === void 0 ? void 0 : _c.trim()) || undefined,
        },
    };
}
