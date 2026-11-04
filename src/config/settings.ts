export interface AppSettings {
  beeApiUrl: string
  gatewayUrl: string
  postageBatchId: string
}

const STORAGE_KEY = 'censorproof.settings.v1'

export const DEFAULT_SETTINGS: AppSettings = {
  beeApiUrl: 'http://127.0.0.1:1633',
  gatewayUrl: 'https://bzz.limo',
  postageBatchId: '',
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS

    const value = JSON.parse(raw) as Partial<AppSettings>
    return {
      beeApiUrl: value.beeApiUrl || DEFAULT_SETTINGS.beeApiUrl,
      gatewayUrl: value.gatewayUrl || DEFAULT_SETTINGS.gatewayUrl,
      postageBatchId: value.postageBatchId || '',
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function normalizeBaseUrl(value: string, label: string): string {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw new Error(`${label} must be a complete URL.`)
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${label} must not contain credentials, query parameters, or a fragment.`)
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} must use HTTP or HTTPS.`)
  }
  if (label === 'Gateway URL' && url.protocol !== 'https:') {
    throw new Error('Gateway URL must use HTTPS.')
  }

  return url.toString().replace(/\/$/, '')
}

export function normalizeBatchId(value: string): string {
  const batchId = value.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(batchId)) {
    throw new Error('Postage Batch ID must contain exactly 64 hexadecimal characters.')
  }
  return batchId.toLowerCase()
}

export function normalizeReference(value: string): string {
  const reference = value.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(reference)) {
    throw new Error('Feed manifest reference must contain exactly 64 hexadecimal characters.')
  }
  return reference.toLowerCase()
}
