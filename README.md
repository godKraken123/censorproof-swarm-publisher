# CensorProof (https://publisher1.vercel.app/)

**A browser-based Swarm publisher with one stable, updateable Feed link.**

**Live app:** [publisher1.vercel.app](https://publisher1.vercel.app/)

CensorProof publishes an article to Ethereum Swarm and points a Swarm Feed at the latest
version. The publisher's browser signs Feed updates locally. Readers retrieve the publication
from Swarm through a gateway; Vercel serves only the static application interface.

## Why this matters

Independent media can lose access to readers when websites are blocked or hosting disappears.
Svobodnye Novosti, also known as FreeNews-Volga, was an independent news outlet based in
Saratov. Mediazona reported that its original domain was blocked in April 2024. In autumn
2024, Russia's Supreme Court revoked its media licence; Mediazona reported that the court
cited a report naming Dmitry Muratov and Andrey Illarionov without the required “foreign
agent” labels as the formal ground. The outlet moved to a new domain in 2025; that domain was
also blocked. In June 2025, the outlet announced it was shutting down after almost 13 years.

Sources: [Mediazona: shutdown announcement](https://zona.media/news/2025/06/14/fnvolga),
[Meduza: English summary](https://meduza.io/en/news/2025/06/17/russian-independent-news-outlet-svobodnye-novosti-shuts-down-after-13-years-amid-pressure-from-federal-censor),
[Mediazona: licence revocation](https://zona.media/news/2024/10/03/fnvolga).

This is the case motivating the demo, not a claim that CensorProof represents the outlet.
The demo publication is an original summary with source links, not copied journalism.

## What CensorProof demonstrates

1. The publisher uploads an article to Swarm using a postage batch.
2. The publisher's browser signs a Feed update with a key controlled by the publisher.
3. The Feed stores the current content reference under its owner and topic.
4. A stable Feed-manifest link resolves to the latest version through a Swarm gateway.

The canonical share link is the raw Swarm gateway URL:

```text
https://<gateway>/bzz/<feed-manifest-reference>/
```

The Vercel reader URL is a convenient way to open the app; it is not the source of the
published article or the Feed pointer. If the Vercel app disappears, the raw Swarm link can
still work while the content is retrievable through Swarm and a gateway or Bee node is
available.

## Published Swarm reference

This Feed-manifest reference has been published and updated. Its current content is the
test article **“test-2 — Publish version 2”**:

- Feed manifest reference: `4b829733036b1a3e6c650bc6dc52c74bcf9ceb1d9dc53e2c8472d0e435d7f3cc`
- [Open via bzz.limo](https://bzz.limo/bzz/4b829733036b1a3e6c650bc6dc52c74bcf9ceb1d9dc53e2c8472d0e435d7f3cc/)

On 2026-11-04, the same manifest resolved first to Feed index 0 and then to Feed index 1;
the latest gateway response contained the v2 test text. The header
`Swarm-Feed-Resolved-Version: v1` describes Bee's Feed payload format, not the article's
revision number. This is still test content, not the final source-linked Svobodnye Novosti
demo article.

## Read a publication

1. Open the **Read** tab in the Vercel app.
2. Paste a 64-character Feed-manifest reference, a `bzz://` link, a gateway URL, or a CensorProof reader link.
3. Select **Load latest from Swarm**. The app requests the Feed/content from the configured
   gateway and renders the returned page in a sandboxed frame.

Readers need no Nook installation, Bee API access, postage batch, or Feed key. You can also
open the canonical raw gateway link directly, without loading the Vercel app.
If a gateway returns a “Request Approval for This Hash” page, that is the gateway's retrieval
policy; it does not mean Bee rejected the upload. The reader reports that case and the default
gateway is `bzz.limo`.

## Publish or update

Publishing happens in the browser and requires a reachable Bee node and a usable postage
batch. The app does not create or fund batches.

1. In **Settings**, check the Bee API and gateway URLs, then choose **Check Bee connection**.
   For Nook on this computer, the default Bee API URL is `http://127.0.0.1:1633`.
2. In **Publish**, enter a Feed name and Batch ID. Generate a Feed key for a new Feed, or
   import the original key to update an existing Feed. Use the same key and Feed name for
   each update.
3. Download the Feed-key backup and confirm you have saved it privately. The app requires
   this confirmation before enabling Publish; the downloaded file is plain text.
4. Enter the title and article text, then publish. The browser uploads the article to Bee,
   signs the Feed update locally, and creates a Feed manifest for a new Feed.
5. Share the **raw Swarm gateway URL** shown after publication. On later updates, reuse the
   same Feed key and name: the content reference changes, but the Feed-manifest URL stays
   the same.

The Feed key is separate from the node funding wallet. Never enter the gift-code or wallet
private key in CensorProof. Losing the Feed key prevents future updates, but does not remove
the last published version.

### Publisher connection requirements

The browser must be on the same computer as a loopback Bee node such as Nook, or have a
different reachable Bee API URL configured. Bee must allow the exact Vercel page origin in
`cors-allowed-origins`; the current production origin is `https://publisher1.vercel.app`.
A local Vite page at `http://localhost:5173` is a different origin and is not currently
allowlisted. Chrome may also ask the user to allow the Vercel site to connect to the local
Bee node. These checks apply to publishers; readers only need the public gateway.

## Limits and security

- Swarm storage is not a promise of universal or permanent availability. Postage duration,
  network retrieval, and gateway availability matter.
- Losing the Feed key means losing the ability to update that Feed. The last published
  version can still be read.
- The Feed key is generated or imported in the browser, held in memory, and never sent to Bee.
  Its optional backup is a private, unencrypted download; keep it somewhere safe and never
  commit it.
- The app does not create or fund postage batches. The publisher supplies a usable Batch ID.
- Nook's Bee API must allow the exact Vercel page origin. A browser may also ask permission
  before connecting from the public HTTPS page to Bee on the publisher's computer.
- **Live-demo status:** a test v1→v2 Feed update resolves through `bzz.limo` at the same
  manifest URL. The final source-linked Svobodnye Novosti article and a fresh-browser demo
  are still pending.

## Running locally

```sh
npm install
npm run dev
npm run build
```

The production output is static files in `dist/`. There are no application API routes,
server runtime, database, Vercel Functions, or server-side Feed signing.

### Runtime settings

- Bee API URL defaults to `http://127.0.0.1:1633` for Nook on the publisher's computer.
- Swarm gateway defaults to `https://bzz.limo`.
- Both URLs can be changed in Settings. The Batch ID is entered in Publish and remembered
  in this browser.
- To publish from production, Bee's `cors-allowed-origins` must include the exact page
  origin. The current configured origin is `https://publisher1.vercel.app`; the local Vite
  origin `http://localhost:5173` is not included.

Readers do not need Bee, a postage batch, or a Feed key. They load published content from the
configured Swarm gateway.
