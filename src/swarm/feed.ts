import { PrivateKey, Reference, Topic } from '@ethersphere/bee-js'
import { normalizeBatchId, normalizeBaseUrl } from '../config/settings'
import { makeBee } from './beeClient'
import type { AppSettings } from '../config/settings'

export interface FeedProfile {
  feedName: string
  topic: string
  owner: string
  manifestReference: string
}

const PROFILE_KEY = 'censorproof.feed-profile.v1'

export function loadFeedProfile(): FeedProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as FeedProfile) : null
  } catch {
    return null
  }
}

export function saveFeedProfile(profile: FeedProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function normalizeFeedName(value: string): string {
  const name = value.trim().normalize('NFC')
  if (name.length < 1 || name.length > 120) {
    throw new Error('Feed name must be between 1 and 120 characters.')
  }
  return name
}

export function generateFeedKey(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    const key = new PrivateKey(bytes)
    try {
      key.publicKey().address()
      return key.toHex()
    } catch {
      // Secp256k1 private keys must be a valid non-zero scalar. Retry with fresh entropy.
    }
  }
  throw new Error('Could not generate a valid Feed key. Try again.')
}

export function deriveOwner(privateKeyHex: string): string {
  const normalized = privateKeyHex.trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Feed key must contain exactly 64 hexadecimal characters.')
  }
  return new PrivateKey(normalized).publicKey().address().toString().toLowerCase()
}

export function downloadFeedKeyBackup(privateKeyHex: string, owner: string): void {
  const content = [
    'CensorProof Feed key backup',
    'Keep this file private. Anyone with this key can update this Feed.',
    `Owner: ${owner}`,
    `Private key: ${privateKeyHex}`,
    '',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `censorproof-feed-key-${owner.slice(0, 8)}.txt`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function createFeedTopic(feedName: string): Topic {
  return Topic.fromString(`censorproof:v1:${normalizeFeedName(feedName)}`)
}

export async function publishVersion(
  settings: AppSettings,
  input: { feedName: string; title: string; body: string; privateKeyHex: string },
): Promise<{ contentReference: string; profile: FeedProfile }> {
  const batchId = normalizeBatchId(settings.postageBatchId)
  const beeApiUrl = normalizeBaseUrl(settings.beeApiUrl, 'Bee API URL')
  const bee = makeBee({ ...settings, beeApiUrl })
  const feedName = normalizeFeedName(input.feedName)
  const topic = createFeedTopic(feedName)
  const privateKeyHex = input.privateKeyHex.trim().replace(/^0x/i, '')
  const signer = new PrivateKey(privateKeyHex)
  const owner = signer.publicKey().address()

  const stamp = await bee.stamp.get(batchId)
  if (!stamp.usable) throw new Error('The selected postage batch is not usable yet.')

  const html = makeArticleHtml(input.title, input.body)
  const file = new File([html], 'index.html', { type: 'text/html;charset=utf-8' })
  const uploaded = await bee.collection.uploadFromFileList(batchId, [file], {
    indexDocument: 'index.html',
    deferred: false,
  })

  const writer = bee.feed.makeWriter(topic, signer)
  await writer.uploadReference(batchId, uploaded.reference, { deferred: false })

  const profile = loadFeedProfile()
  let manifestReference: Reference
  if (profile && profile.topic === topic.toString() && profile.owner === owner.toString().toLowerCase()) {
    manifestReference = new Reference(profile.manifestReference)
  } else {
    manifestReference = await bee.feed.createManifest(batchId, topic, owner, { deferred: false })
  }

  const nextProfile: FeedProfile = {
    feedName,
    topic: topic.toString(),
    owner: owner.toString().toLowerCase(),
    manifestReference: manifestReference.toString(),
  }
  saveFeedProfile(nextProfile)

  return {
    contentReference: uploaded.reference.toString(),
    profile: nextProfile,
  }
}

function makeArticleHtml(title: string, body: string): string {
  const safeTitle = escapeHtml(title.trim() || 'Untitled publication')
  const safeBody = escapeHtml(body).replace(/\r?\n/g, '<br>')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, sans-serif; }
    body { max-width: 720px; margin: 8vh auto; padding: 0 24px; color: #20211e; line-height: 1.7; }
    h1 { line-height: 1.15; letter-spacing: -0.04em; }
    article { white-space: normal; }
  </style>
</head>
<body><main><article><h1>${safeTitle}</h1><p>${safeBody}</p></article></main></body>
</html>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}
