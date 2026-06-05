/**
 * PII redaction utility for notification payloads.
 * Scans strings for common PII patterns and masks them.
 */

export const REDACTED_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: 'email',
  },
  {
    pattern: /\b\+?[\d\s\-()]{7,15}\b/g,
    name: 'phone',
  },
  {
    pattern: /(https?:\/\/[^\s]*[?&](?:token|key|secret|password|api_key)=[^\s&]+)/gi,
    name: 'url_with_token',
  },
  {
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    name: 'jwt',
  },
]

/**
 * Stringify a value and redact PII patterns.
 * Returns the redacted string.
 */
export function redactValue(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }

  let str: string
  if (typeof value === 'object') {
    try {
      str = JSON.stringify(value)
    } catch {
      str = String(value)
    }
  } else {
    str = String(value)
  }

  for (const { pattern, name } of REDACTED_PATTERNS) {
    str = str.replace(pattern, `[REDACTED_${name.toUpperCase()}]`)
  }

  return str
}

/**
 * Redact PII from all string values in an object.
 * Returns a new object with redacted values.
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = redactValue(value)
    } else {
      result[key] = value
    }
  }

  return result
}
