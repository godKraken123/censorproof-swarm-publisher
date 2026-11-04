import { Bee } from '@ethersphere/bee-js'
import { normalizeBaseUrl, normalizeReference } from '../config/settings'

export interface ResolvedPublication {
  html: string
  gatewayUrl: string
  manifestReference: string
  resolution: 'feed' | 'manifest'
}

export async function resolvePublication(
  gatewayBase: string,
  inputReference: string,
  locator?: { owner: string; topic: string },
): Promise<ResolvedPublication> {
  const gatewayUrl = normalizeBaseUrl(gatewayBase, 'Gateway URL')
  const manifestReference = extractManifestReference(inputReference)

  if (locator?.owner && locator.topic) {
    try {
      const bee = new Bee(gatewayUrl)
      const latest = await bee.feed.makeReader(locator.topic, locator.owner).downloadReference()
      const file = await bee.file.download(latest.reference)
      return {
        html: file.data.toUtf8(),
        gatewayUrl,
        manifestReference,
        resolution: 'feed',
      }
    } catch {
      // Some gateways may not expose every Feed response header to browser JS.
      // The stable manifest endpoint remains the interoperable fallback.
    }
  }

  const url = `${gatewayUrl}/bzz/${manifestReference}/`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Swarm gateway returned HTTP ${response.status}. Check the Feed manifest and try again.`)
  }

  const html = await response.text()
  if (!html.trim()) throw new Error('The Swarm gateway returned an empty publication.')
  if (isGatewayApprovalPage(html)) {
    throw new Error(
      'This gateway requires approval for this hash. In Settings, use https://bzz.limo or request approval from the gateway operator.',
    )
  }

  return { html, gatewayUrl, manifestReference, resolution: 'manifest' }
}

function isGatewayApprovalPage(html: string): boolean {
  const text = html.toLowerCase()
  return text.includes('request approval for this hash') || text.includes('this hash is not yet approved for retrieval')
}

export function extractManifestReference(value: string): string {
  const input = value.trim()
  if (!input) throw new Error('Enter a Feed manifest reference or share link.')

  if (/^(0x)?[0-9a-fA-F]{64}$/.test(input)) return normalizeReference(input)
  if (input.toLowerCase().startsWith('bzz://')) {
    const reference = input.slice('bzz://'.length).split(/[/?#]/, 1)[0]
    return normalizeReference(reference)
  }

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Enter a 64-character Feed manifest reference or a Swarm/share URL.')
  }

  const queryReference = url.searchParams.get('feed')
  if (queryReference) return normalizeReference(queryReference)

  const parts = url.pathname.split('/').filter(Boolean)
  const bzzIndex = parts.indexOf('bzz')
  if (bzzIndex >= 0 && parts[bzzIndex + 1]) return normalizeReference(parts[bzzIndex + 1])

  throw new Error('The URL does not contain a Swarm Feed manifest reference.')
}
