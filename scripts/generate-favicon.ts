/**
 * Regenerates src/app/favicon.ico from the Cashly mark (16, 32 and 48 px).
 * Run after changing the logo:
 *
 *   npx vite-node --config vitest.config.ts scripts/generate-favicon.ts
 *
 * Modern ICO files may embed PNG images directly, so each size is rendered
 * with the same markImage() the app uses and packed into an ICO container.
 */
import { writeFileSync } from 'node:fs'
import { markImage } from '../src/lib/brand/mark-image'

const SIZES = [16, 32, 48]

const pngs = await Promise.all(
  SIZES.map(async (px) => Buffer.from(await markImage(px, { rounded: true }).arrayBuffer()))
)

const HEADER = 6
const ENTRY = 16
const header = Buffer.alloc(HEADER)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(SIZES.length, 4)

let offset = HEADER + ENTRY * SIZES.length
const entries = SIZES.map((px, i) => {
  const entry = Buffer.alloc(ENTRY)
  entry.writeUInt8(px % 256, 0) // width (0 means 256)
  entry.writeUInt8(px % 256, 1) // height
  entry.writeUInt8(0, 2) // palette
  entry.writeUInt8(0, 3) // reserved
  entry.writeUInt16LE(1, 4) // colour planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(pngs[i].length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += pngs[i].length
  return entry
})

const ico = Buffer.concat([header, ...entries, ...pngs])
writeFileSync('src/app/favicon.ico', ico)
console.log(`favicon.ico written: ${SIZES.join(', ')} px, ${ico.length} bytes`)
