export const MAX_CHUNK_LIMIT = 4096
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024
export const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
export const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i
export const PAIRING_CODE_TTL_MS = 60 * 60 * 1000
export const PAIRING_MAX_PENDING = 3
export const PAIRING_MAX_REPLIES = 2
