'use strict';

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';

const DEFAULT_IMAGE = path.resolve('WhatsApp Image 2026-03-12 at 11.14.44.jpeg');
const PREPROCESS_DIR = path.join('tmp', 'ocr');

const { createWorker, PSM } = Tesseract;

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const GEMINI_PROMPT = process.env.GEMINI_PROMPT
  ?? 'Extract every legible text line from this image, keeping punctuation and line breaks.';

const GEMINI_ENABLED = process.argv.includes('--gemini');
const GEMINI_SKIPPED = process.argv.includes('--skip-gemini');

const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const guessMimeType = (filePath) => {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return map[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getFileState = (file) => {
  if (!file?.state) return null;
  return typeof file.state === 'string' ? file.state : file.state.name ?? null;
};

const waitForFileActive = async (filesService, name) => {
  let file = await filesService.get({ name });
  while (getFileState(file) !== 'ACTIVE') {
    if (getFileState(file) === 'FAILED') {
      throw new Error(`Gemini file ${name} failed to activate`);
    }
    await sleep(1500);
    file = await filesService.get({ name });
  }
  return file;
};

const uploadImageToGemini = async (imagePath) => {
  if (!geminiClient?.files) {
    throw new Error('Gemini files API is unavailable');
  }
  const mimeType = guessMimeType(imagePath);
  const upload = await geminiClient.files.upload({
    file: imagePath,
    config: {
      mimeType,
    },
  });
  if (getFileState(upload) === 'ACTIVE') {
    return upload;
  }
  return waitForFileActive(geminiClient.files, upload.name);
};

const runGemini = async (imagePath) => {
  if (!geminiClient) return null;
  if (!GEMINI_ENABLED) return null;
  if (GEMINI_SKIPPED) {
    console.log('Skipping Gemini extraction (--skip-gemini).');
    return null;
  }
  console.log('Uploading image to Gemini...');
  const file = await uploadImageToGemini(imagePath);
  console.log(`Gemini uploaded ${file.name} (${file.uri})`);
  const response = await geminiClient.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      createUserContent([
        GEMINI_PROMPT,
        createPartFromUri(file.uri, file.mimeType ?? guessMimeType(imagePath)),
      ]),
    ],
  });
  return response.text?.trim() ?? null;
};

const preprocessImage = async (imagePath) => {
  const buffer = await sharp(imagePath)
    .resize({ width: 1600 })
    .grayscale()
    .normalize()
    .linear(1.15, -12)
    .gamma(1.2)
    .sharpen()
    .median(1)
    .toBuffer();

  await fs.mkdir(PREPROCESS_DIR, { recursive: true });
  const baseName = path.basename(imagePath, path.extname(imagePath));
  const outputPath = path.join(PREPROCESS_DIR, `${baseName}-preprocessed.png`);
  await fs.writeFile(outputPath, buffer);

  return { buffer, outputPath };
};

const runRecognition = async (worker, input, label, psm) => {
  const start = Date.now();
  const { data: { text } } = await worker.recognize(input, {
    tessedit_pageseg_mode: psm,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const trimmed = text.trim();
  console.log(`[OCR] ${label} (${elapsed}s): ${trimmed || '<empty>'}`);
  return trimmed;
};

const main = async () => {
  const imageArg = process.argv[2];
  const imagePath = imageArg ? path.resolve(imageArg) : DEFAULT_IMAGE;

  console.log('Running OCR on', imagePath);

  const worker = await createWorker(undefined, undefined, {
    cachePath: path.resolve('.'),
    langPath: path.resolve('.'),
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?()&%-/\\\'" ',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    const raw = await runRecognition(worker, imagePath, 'raw', PSM.SINGLE_BLOCK);
    const { buffer, outputPath } = await preprocessImage(imagePath);
    console.log('Preprocessed image saved to', outputPath);
    const clean = await runRecognition(worker, buffer, 'preprocessed', PSM.SINGLE_BLOCK);
    let geminiText = null;
    if (!GEMINI_ENABLED) {
      console.log('Run with --gemini to trigger the Gemini extraction stage.');
    } else if (!geminiClient) {
      console.log('GEMINI_API_KEY not set; skipping Gemini extraction.');
    } else {
      try {
        geminiText = await runGemini(outputPath);
      } catch (error) {
        console.error('Gemini extraction failed', error);
      }
    }

    console.log('\nSummary');
    console.log('-------');
    console.log('Raw text:', raw || '<empty>');
    console.log('Preprocessed text:', clean || '<empty>');
    console.log('Gemini text:', geminiText || '<not run>');
  } finally {
    await worker.terminate();
  }
};

main().catch((error) => {
  console.error('OCR ERROR', error);
  process.exit(1);
});
