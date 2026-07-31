import type { Metadata, MetadataValue } from './types.js'

const MAX_ITEMS = 20
const MAX_BYTES = 4096
const SENSITIVE_KEYS = ['authorization', 'cookie', 'password', 'token', 'secret', 'email', 'ip']

export function sanitizeMetadata(metadata: Metadata = {}, allowedKeys: readonly string[] = []): Metadata {
  const safe: Metadata = {}

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    if (!isSafeScalar(rawValue) || isSensitive(rawKey) || !isAllowed(rawKey, allowedKeys)) continue

    const key = rawKey.slice(0, 120)
    const value = typeof rawValue === 'string' ? rawValue.slice(0, 1000) : rawValue
    const candidate = { ...safe, [key]: value }
    if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_BYTES) continue

    safe[key] = value
    if (Object.keys(safe).length === MAX_ITEMS) break
  }

  return safe
}

function isSafeScalar(value: unknown): value is MetadataValue {
  return value === null
    || typeof value === 'boolean'
    || typeof value === 'string'
    || (typeof value === 'number' && Number.isFinite(value))
}

function isAllowed(key: string, allowedKeys: readonly string[]): boolean {
  return key.startsWith('header.') || key === 'exception' || allowedKeys.includes(key)
}

function isSensitive(key: string): boolean {
  const normalized = key.toLowerCase()
  return SENSITIVE_KEYS.some(sensitive => normalized.includes(sensitive))
}
