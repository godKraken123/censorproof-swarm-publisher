import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from './config/settings'
import {
  deriveOwner,
  downloadFeedKeyBackup,
  generateFeedKey,
  loadFeedProfile,
  publishVersion,
  type FeedProfile,
} from './swarm/feed'
import { checkBeeHealth } from './swarm/beeClient'
import { resolvePublication } from './swarm/reader'

type Tab = 'publish' | 'read' | 'settings'

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [tab, setTab] = useState<Tab>(window.location.search.includes('feed=') ? 'read' : 'publish')
  const [profile, setProfile] = useState<FeedProfile | null>(loadFeedProfile())
  const [feedName, setFeedName] = useState(profile?.feedName ?? '')
  const [title, setTitle] = useState('A story that stays reachable')
  const [body, setBody] = useState('Write a short publication. The publisher controls the Feed key; the latest reference is stored in Swarm.')
  const [privateKeyHex, setPrivateKeyHex] = useState('')
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const [batchId, setBatchId] = useState(settings.postageBatchId)
  const initialQuery = new URLSearchParams(window.location.search)
  const [manifestInput, setManifestInput] = useState(initialQuery.get('feed') ?? profile?.manifestReference ?? '')
  const [feedOwner, setFeedOwner] = useState(initialQuery.get('owner') ?? profile?.owner ?? '')
  const [feedTopic, setFeedTopic] = useState(initialQuery.get('topic') ?? profile?.topic ?? '')
  const [resolvedHtml, setResolvedHtml] = useState('')
  const [resolutionMethod, setResolutionMethod] = useState<'feed' | 'manifest' | ''>('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [beeHealth, setBeeHealth] = useState('Not connected')

  const owner = useMemo(() => {
    if (!privateKeyHex.trim()) return ''
    try {
      return deriveOwner(privateKeyHex)
    } catch {
      return ''
    }
  }, [privateKeyHex])

  useEffect(() => {
    if (!profile) return
    setFeedName(current => current || profile.feedName)
    setManifestInput(current => current || profile.manifestReference)
  }, [profile])

  function updateSettings(next: AppSettings): void {
    setSettings(next)
    setBatchId(next.postageBatchId)
    saveSettings(next)
  }

  function updateBatchId(value: string): void {
    setBatchId(value)
    const next = { ...settings, postageBatchId: value }
    setSettings(next)
    saveSettings(next)
  }

  async function handleCheckBee(): Promise<void> {
    setError('')
    setStatus('Checking local Bee…')
    try {
      const result = await checkBeeHealth(settings)
      setBeeHealth(result)
      setStatus('Bee API is reachable from this browser.')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Bee API check failed.'
      setBeeHealth('Not connected')
      setStatus('')
      setError(message)
    }
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setStatus('Validating the batch and publishing…')
    setBusy(true)
    try {
      const result = await publishVersion(
        { ...settings, postageBatchId: batchId },
        { feedName, title, body, privateKeyHex },
      )
      setProfile(result.profile)
      setManifestInput(result.profile.manifestReference)
      setFeedOwner(result.profile.owner)
      setFeedTopic(result.profile.topic)
      setStatus(`Published. Content reference: ${result.contentReference}`)
    } catch (cause) {
      setStatus('')
      setError(cause instanceof Error ? cause.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRead(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError('')
    setStatus('Resolving the Feed manifest from Swarm…')
    setResolvedHtml('')
    setResolutionMethod('')
    try {
      const locator = feedOwner.trim() && feedTopic.trim()
        ? { owner: feedOwner.trim(), topic: feedTopic.trim() }
        : undefined
      const publication = await resolvePublication(settings.gatewayUrl, manifestInput, locator)
      setResolvedHtml(publication.html)
      setResolutionMethod(publication.resolution)
      setStatus(publication.resolution === 'feed'
        ? 'Latest reference read from the Swarm Feed via the configured gateway.'
        : 'Feed manifest resolved by the configured Swarm gateway.')
    } catch (cause) {
      setStatus('')
      setError(cause instanceof Error ? cause.message : 'Could not load publication.')
    }
  }

  const rawSwarmUrl = profile
    ? `${settings.gatewayUrl.replace(/\/$/, '')}/bzz/${profile.manifestReference}/`
    : ''
  const appShareUrl = profile
    ? `${window.location.origin}/?${new URLSearchParams({ feed: profile.manifestReference, owner: profile.owner, topic: profile.topic })}`
    : ''

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CensorProof home">
          <span className="brand-mark">C</span>
          <span>CensorProof</span>
        </a>
        <span className="network-pill"><i /> SWARM · GNOSIS</span>
      </header>

      <section className="hero">
        <p className="eyebrow">A link that can outlive its website</p>
        <h1>Publish once.<br /><em>Keep the same address.</em></h1>
        <p className="hero-copy">Content is stored on Swarm. A Feed keeps its latest version pointer. Signing stays in the publisher’s browser.</p>
      </section>

      <nav className="tabs" aria-label="Application sections">
        <button className={tab === 'publish' ? 'tab active' : 'tab'} onClick={() => setTab('publish')}>Publish</button>
        <button className={tab === 'read' ? 'tab active' : 'tab'} onClick={() => setTab('read')}>Read</button>
        <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>Settings</button>
      </nav>

      <section className="workspace">
        {tab === 'publish' && (
          <form className="panel" onSubmit={handlePublish}>
            <div className="panel-heading">
              <div><p className="eyebrow">Publisher · browser-signed</p><h2>Publish or update a Feed</h2></div>
              <span className="node-state"><i className={beeHealth.startsWith('ok') ? 'online' : ''} />{beeHealth}</span>
            </div>

            <div className="two-col">
              <label>Feed name
                <input value={feedName} onChange={event => setFeedName(event.target.value)} placeholder="censorproof:fn-volga" required />
              </label>
              <label>Postage Batch ID
                <input value={batchId} onChange={event => updateBatchId(event.target.value)} placeholder="64 hexadecimal characters" spellCheck={false} required />
              </label>
            </div>

            <label>Feed private key <span className="label-note">kept in this tab only</span>
              <input type="password" value={privateKeyHex} onChange={event => { setPrivateKeyHex(event.target.value); setBackupDownloaded(false); setBackupConfirmed(false) }} placeholder="Generate a new key or import an existing Feed key" autoComplete="off" spellCheck={false} required />
            </label>
            <div className="key-actions">
              <button type="button" className="button secondary" onClick={() => { setPrivateKeyHex(generateFeedKey()); setBackupDownloaded(false); setBackupConfirmed(false); setError(''); setStatus('New Feed key generated in this browser tab.') }}>Generate Feed key</button>
              {privateKeyHex && <button type="button" className="button secondary" onClick={() => { if (!owner) { setError('Enter a valid Feed key first.'); return }; downloadFeedKeyBackup(privateKeyHex, owner); setBackupDownloaded(true); setBackupConfirmed(false); setError(''); setStatus('Key backup downloaded. Keep it private.') }}>Download key backup</button>}
              {owner && <span className="owner">Owner: {owner.slice(0, 10)}…{owner.slice(-8)}</span>}
            </div>

            {privateKeyHex && <label className="check-row"><input type="checkbox" checked={backupConfirmed} disabled={!backupDownloaded} onChange={event => setBackupConfirmed(event.target.checked)} />I have saved the Feed key backup somewhere private.</label>}

            <label>Title
              <input value={title} onChange={event => setTitle(event.target.value)} maxLength={180} required />
            </label>
            <label>Publication text
              <textarea value={body} onChange={event => setBody(event.target.value)} rows={8} required />
            </label>

            {profile && <p className="existing-feed">Existing Feed profile found: updates use the same topic and Feed key. Manifest <code>{profile.manifestReference}</code></p>}

            <button className="button primary" type="submit" disabled={busy || !backupConfirmed}>
              {busy ? 'Publishing…' : profile ? 'Publish next version' : 'Publish first version'}
            </button>
            <p className="fine-print">This app never creates or funds a batch. It uses the Batch ID you provide and signs Feed updates in this browser.</p>
          </form>
        )}

        {tab === 'read' && (
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Reader · no Bee node required</p><h2>Resolve a Swarm Feed</h2></div></div>
            <form onSubmit={handleRead} className="stack">
              <label>Feed manifest reference
                <input value={manifestInput} onChange={event => setManifestInput(event.target.value)} placeholder="Reference, bzz:// link, gateway URL, or Vercel reader link" spellCheck={false} required />
              </label>
              <details className="feed-locator">
                <summary>Feed locator (optional; enables direct owner/topic read)</summary>
                <div className="two-col">
                  <label>Feed owner
                    <input value={feedOwner} onChange={event => setFeedOwner(event.target.value)} placeholder="Ethereum address" spellCheck={false} />
                  </label>
                  <label>Feed topic
                    <input value={feedTopic} onChange={event => setFeedTopic(event.target.value)} placeholder="32-byte topic (hex)" spellCheck={false} />
                  </label>
                </div>
              </details>
              <button className="button primary" type="submit">Load latest from Swarm</button>
            </form>
            {resolvedHtml && <div className="publication-frame"><iframe title="Swarm publication" sandbox="" referrerPolicy="no-referrer" srcDoc={resolvedHtml} /></div>}
            {resolutionMethod === 'feed' && <p className="fine-print">Reader used the owner/topic Feed API, then fetched the latest content reference from the gateway.</p>}
            {manifestInput && <a className="raw-link" href={`${settings.gatewayUrl.replace(/\/$/, '')}/bzz/${manifestInput.trim().replace(/^0x/i, '')}/`} target="_blank" rel="noreferrer">Open raw Swarm URL ↗</a>}
          </section>
        )}

        {tab === 'settings' && (
          <form className="panel" onSubmit={event => { event.preventDefault(); updateSettings(settings); setStatus('Settings saved in this browser.'); setError('') }}>
            <div className="panel-heading"><div><p className="eyebrow">Runtime configuration</p><h2>Endpoints and batch</h2></div></div>
            <label>Bee API URL
              <input value={settings.beeApiUrl} onChange={event => setSettings({ ...settings, beeApiUrl: event.target.value })} spellCheck={false} />
            </label>
            <label>Swarm gateway URL
              <input value={settings.gatewayUrl} onChange={event => setSettings({ ...settings, gatewayUrl: event.target.value })} spellCheck={false} />
            </label>
            <div className="key-actions">
              <button className="button primary" type="submit">Save settings</button>
              <button className="button secondary" type="button" onClick={handleCheckBee}>Check Bee connection</button>
              <button className="button text-button" type="button" onClick={() => updateSettings(DEFAULT_SETTINGS)}>Reset defaults</button>
            </div>
            <p className="fine-print">The Batch ID is entered in Publish and remembered in this browser. Settings and Feed profile are convenience metadata; the latest content reference remains in the Swarm Feed.</p>
          </form>
        )}
      </section>

      {(status || error) && <div className={error ? 'notice error' : 'notice'} role="status">{error || status}</div>}

      {profile && (
        <section className="result-card">
          <div><p className="eyebrow">Stable Swarm address</p><a href={rawSwarmUrl} target="_blank" rel="noreferrer">{rawSwarmUrl}</a></div>
          <button className="button secondary" onClick={() => navigator.clipboard.writeText(rawSwarmUrl)}>Copy Swarm link</button>
          <p className="fine-print">Feed owner: <code>{profile.owner}</code><br />Feed topic: <code>{profile.topic}</code></p>
          <p className="fine-print">Optional Vercel reader link: <a href={appShareUrl}>{appShareUrl}</a></p>
        </section>
      )}

      <footer className="footer"><span>CONTENT ON SWARM</span><span>FEED POINTER ON SWARM</span><span>KEY STAYS IN YOUR BROWSER</span></footer>
    </main>
  )
}
