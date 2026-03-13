"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_FIELD_KEYS = exports.AI_DOCUMENT_TYPES = void 0;
exports.isSupportedAiDocumentType = isSupportedAiDocumentType;
exports.uploadPhotoForAiExtraction = uploadPhotoForAiExtraction;
exports.extractStructuredDocumentWithGemini = extractStructuredDocumentWithGemini;
const crypto_1 = require("crypto");
const os_1 = require("os");
const path_1 = require("path");
const promises_1 = require("fs/promises");
const zod_1 = require("zod");
const genai_1 = require("@google/genai");
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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
function getGeminiClient(apiKey) {
    return new genai_1.GoogleGenAI({ apiKey });
}
function getFileState(file) {
    var _a;
    if (!(file === null || file === void 0 ? void 0 : file.state))
        return null;
    return typeof file.state === 'string' ? file.state : (_a = file.state.name) !== null && _a !== void 0 ? _a : null;
}
function getTempUploadPath(file) {
    var _a;
    const extension = ((_a = file.name.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'jpg';
    const tempRoot = process.env.TMPDIR || process.env.TEMP || process.env.TMP || (0, os_1.tmpdir)();
    return (0, path_1.resolve)(tempRoot, 'centreconnect', 'gemini-uploads', `${Date.now()}-${(0, crypto_1.randomUUID)()}.${extension}`);
}
async function waitForGeminiFileActive(filesService, name) {
    let uploaded = await filesService.get({ name });
    while (getFileState(uploaded) !== 'ACTIVE') {
        if (getFileState(uploaded) === 'FAILED') {
            throw new Error(`Gemini file ${name} failed to activate.`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        uploaded = await filesService.get({ name });
    }
    return uploaded;
}
async function runGeminiSdkExtraction(input, apiKey) {
    const client = getGeminiClient(apiKey);
    const mimeType = input.file.type || 'image/jpeg';
    const tempPath = getTempUploadPath(input.file);
    await promises_1.mkdir((0, path_1.dirname)(tempPath), { recursive: true });
    await promises_1.writeFile(tempPath, Buffer.from(await input.file.arrayBuffer()));
    try {
        const uploaded = await client.files.upload({
            file: tempPath,
            config: { mimeType },
        });
        if (!uploaded.name) {
            throw new Error('Gemini upload did not return a file name.');
        }
        const readyFile = getFileState(uploaded) === 'ACTIVE'
            ? uploaded
            : await waitForGeminiFileActive(client.files, uploaded.name);
        const response = await client.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
                (0, genai_1.createUserContent)([
                    buildPrompt(input.documentType),
                    (0, genai_1.createPartFromUri)(readyFile.uri, readyFile.mimeType || mimeType),
                ]),
            ],
        });
        return (response.text || '').trim();
    }
    finally {
        await promises_1.unlink(tempPath).catch(() => { });
    }
}
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
        exports.AI_FIELD_KEYS.join(', '),
        'Use ISO dates (YYYY-MM-DD) for date fields when possible.',
        'For allergies/medical_conditions/medications return arrays.',
    ];
    if (documentType === 'register') {
        basePrompt.push('For attendance registers: include every detected child name in fields.full_name as an array of strings.', 'Do not collapse names into one string and do not return duplicates.', 'If the page contains a date, store it in fields.record_date.');
    }
    return basePrompt.join('\n');
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
async function extractStructuredDocumentWithGemini(input) {
    var _a;
    const apiKey = (_a = process.env.GEMINI_API_KEY) === null || _a === void 0 ? void 0 : _a.trim();
    if (!apiKey) {
        return {
            success: false,
            message: 'AI extraction is not configured.',
        };
    }
    const bytes = Buffer.from(await input.file.arrayBuffer());
    if (bytes.byteLength > 10000000) {
        return {
            success: false,
            message: 'Document exceeds 10MB limit for AI extraction.',
        };
    }
    try {
        const rawText = await runGeminiSdkExtraction(input, apiKey);
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
        catch (_a) {
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
        for (const [key, entry] of Object.entries(parsed.data.fields || {})) {
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
                summary: parsed.data.summary && parsed.data.summary.trim ? parsed.data.summary.trim() : undefined,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            message: `AI extraction request failed before response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
