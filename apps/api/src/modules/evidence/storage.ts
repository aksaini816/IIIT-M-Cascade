import { createReadStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

export interface StorageProvider {
  savePrivateFile(privateObjectKey: string, content: Buffer): Promise<void>
  readPrivateFileStream(privateObjectKey: string): NodeJS.ReadableStream
  scanFileForMalwareHook(content: Buffer): Promise<{ clean: boolean; reason?: string }>
}

function safePath(root: string, key: string) {
  const resolvedRoot = resolve(root)
  const resolved = resolve(root, key)
  if (!resolved.startsWith(`${resolvedRoot}\\`) && resolved !== resolvedRoot) throw new Error('Invalid private object key')
  return resolved
}

export class LocalPrivateStorage implements StorageProvider {
  constructor(private readonly root = process.env.OBJECT_STORAGE_DIR || './.storage/evidence') {}

  async savePrivateFile(privateObjectKey: string, content: Buffer) {
    const target = safePath(this.root, privateObjectKey)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, { flag: 'wx' })
  }

  readPrivateFileStream(privateObjectKey: string) {
    return createReadStream(safePath(this.root, privateObjectKey))
  }

  async scanFileForMalwareHook(_content: Buffer): Promise<{ clean: boolean; reason?: string }> {
    return { clean: true }
  }
}

export function sanitizeFilename(filename: string) {
  const base = filename.replace(/[/\\\0]/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  return base || 'evidence.bin'
}

export function privateObjectKeyFor(filename: string) {
  return `${crypto.randomUUID()}-${sanitizeFilename(filename)}`
}

export async function readPrivateFile(privateObjectKey: string, provider = new LocalPrivateStorage()) {
  return readFile(safePath(process.env.OBJECT_STORAGE_DIR || './.storage/evidence', privateObjectKey))
}
