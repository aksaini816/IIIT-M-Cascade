import { createHash } from 'node:crypto'
import { HttpError } from '../../middleware/errors.js'

export const EVIDENCE_SHA256_NOTE = 'Exact SHA-256 matching proves byte-identical file consistency and catches duplicate uploads, but does not independently prove an invoice is authentic.'
const MAX_FILE_SIZE = 5 * 1024 * 1024

const signatures: Record<string, Buffer[]> = {
  'application/pdf': [Buffer.from('%PDF-')],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
}

export function validateEvidenceBytes(content: Buffer, mimeType: string) {
  if (content.length === 0 || content.length > MAX_FILE_SIZE) throw new HttpError(413, 'EVIDENCE_SIZE_INVALID', 'Evidence files must be between 1 byte and 5 MB.')
  const allowed = signatures[mimeType]
  const validHeader = mimeType === 'image/webp'
    ? content.subarray(0, 4).equals(Buffer.from('RIFF')) && content.subarray(8, 12).equals(Buffer.from('WEBP'))
    : Boolean(allowed?.some((signature) => content.subarray(0, signature.length).equals(signature)))
  if (!allowed || !validHeader) throw new HttpError(415, 'EVIDENCE_MAGIC_BYTES_INVALID', 'The file type is not allowed or its magic bytes do not match the declared MIME type.')
  return createHash('sha256').update(content).digest('hex')
}
