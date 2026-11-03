import { Bee } from '@ethersphere/bee-js'
import { normalizeBaseUrl, type AppSettings } from '../config/settings'

export function makeBee(settings: AppSettings): Bee {
  const beeApiUrl = normalizeBaseUrl(settings.beeApiUrl, 'Bee API URL')
  return new Bee(beeApiUrl)
}

export async function checkBeeHealth(settings: AppSettings): Promise<string> {
  const beeApiUrl = normalizeBaseUrl(settings.beeApiUrl, 'Bee API URL')
  const response = await fetch(`${beeApiUrl}/health`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Bee health check failed: HTTP ${response.status}`)

  const value = (await response.json()) as { status?: string; version?: string; apiVersion?: string }
  return `${value.status ?? 'unknown'}${value.version ? ` · Bee ${value.version}` : ''}${value.apiVersion ? ` · API ${value.apiVersion}` : ''}`
}
