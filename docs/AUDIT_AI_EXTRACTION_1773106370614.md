# AI Register Extraction Audit

1. Loading test image: public/centres/bajabulile/hero.jpg
   - SUCCESS: Image loaded. Size: 170773 bytes, Type: image/jpeg

2. Calling extractStructuredDocumentWithGemini...

❌ AI extraction audit FAILED: AI extraction failed: AI extraction request failed (404): {
  "error": {
    "code": 404,
    "message": "models/gemini-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported meth