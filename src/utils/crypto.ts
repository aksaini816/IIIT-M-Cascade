export const SHA256_NOTE = 'SHA-256 proves file byte-consistency and prevents duplicate receipt reuse across claims; it does NOT independently prove that an invoice is genuine.'

export async function computeFileSHA256(file: File): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function computeTextSHA256(text: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
