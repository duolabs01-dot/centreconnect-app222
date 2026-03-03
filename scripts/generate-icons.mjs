import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const sourceSvg = path.join(publicDir, 'centreconnect-logo.svg')

async function renderPng(size) {
  return sharp(sourceSvg)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

function buildIco(images) {
  const count = images.length
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const entries = Buffer.alloc(16 * count)
  let offset = 6 + 16 * count

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index]
    const entryOffset = index * 16
    const sizeByte = image.size >= 256 ? 0 : image.size

    entries.writeUInt8(sizeByte, entryOffset + 0)
    entries.writeUInt8(sizeByte, entryOffset + 1)
    entries.writeUInt8(0, entryOffset + 2)
    entries.writeUInt8(0, entryOffset + 3)
    entries.writeUInt16LE(1, entryOffset + 4)
    entries.writeUInt16LE(32, entryOffset + 6)
    entries.writeUInt32LE(image.data.length, entryOffset + 8)
    entries.writeUInt32LE(offset, entryOffset + 12)
    offset += image.data.length
  }

  return Buffer.concat([header, entries, ...images.map((entry) => entry.data)])
}

async function run() {
  const icon192 = await renderPng(192)
  const icon512 = await renderPng(512)
  const apple180 = await renderPng(180)
  const icon32 = await renderPng(32)
  const icon16 = await renderPng(16)

  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192)
  fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.png'), icon192)
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512)
  fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), icon512)
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180)

  const iconsDir = path.join(publicDir, 'icons')
  fs.mkdirSync(iconsDir, { recursive: true })
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192)
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512)

  const faviconBuffer = buildIco([
    { size: 16, data: icon16 },
    { size: 32, data: icon32 },
  ])
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconBuffer)
}

run().catch((error) => {
  console.error('Failed to generate icons:', error)
  process.exit(1)
})
