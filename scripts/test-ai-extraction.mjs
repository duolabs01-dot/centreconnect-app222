// Ensure ts-node is registered before importing TypeScript files
import 'ts-node/register'

import { extractStructuredDocumentWithGemini } from '../lib/ai/document-extraction-service.js'
import fs from 'node:fs/promises'
import path from 'node:path'

const TEST_REGISTER_IMAGE_PATH = 'public/centres/bajabulile/hero.jpg'

async function main() {
  const auditLog = ['# AI Register Extraction Audit\n']
  
  try {
    auditLog.push(`1. Loading test image: ${TEST_REGISTER_IMAGE_PATH}`)
    const fileBuffer = await fs.readFile(TEST_REGISTER_IMAGE_PATH)
    // Create an object that mimics the File interface's required properties
    const mockFile = {
      name: 'test-register.jpg',
      type: 'image/jpeg',
      arrayBuffer: () => Promise.resolve(fileBuffer.buffer),
      size: fileBuffer.length
    }

    auditLog.push(`   - SUCCESS: Image loaded. Size: ${mockFile.size} bytes, Type: ${mockFile.type}`)

    auditLog.push(`\n2. Calling extractStructuredDocumentWithGemini...`)
    const result = await extractStructuredDocumentWithGemini({
      file: mockFile, // Pass the mock file object
      documentType: 'register',
    })

    if (!result.success) {
      throw new Error(`AI extraction failed: ${result.message}`)
    }

    if (!result.extraction) {
      throw new Error('AI extraction returned no data.')
    }

    auditLog.push(`   - SUCCESS: AI extraction completed.`)
    auditLog.push(`     - Summary: ${result.extraction.summary || 'N/A'}`)
    auditLog.push(`     - Fields:`)
    for (const [key, value] of Object.entries(result.extraction.fields)) {
      // Ensure value.value is always an array for consistent logging
      const fieldValue = Array.isArray(value.value) ? value.value.join(', ') : value.value;
      auditLog.push(`       - ${key}: ${fieldValue} (Confidence: ${value.confidence}%)`)
    }
    
    auditLog.push(`\n✅ AI extraction audit PASSED.`)
  } catch (error) {
    auditLog.push(`\n❌ AI extraction audit FAILED: ${error.message}`)
    console.error(error)
  } finally {
    const auditFileName = `docs/AUDIT_AI_EXTRACTION_${Date.now()}.md`
    await fs.writeFile(auditFileName, auditLog.join('\n'))
    console.log(`\nAudit log written to ${auditFileName}`)
  }
}

main()
