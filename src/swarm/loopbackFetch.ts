type RequestInitWithAddressSpace = RequestInit & { targetAddressSpace?: 'loopback' }

let installed = false

/**
 * Chrome's Local Network Access guidance asks HTTPS pages to mark requests to
 * loopback explicitly. bee-js 13.2.0 uses the global fetch API but does not
 * expose targetAddressSpace in BeeRequestOptions, so annotate only loopback
 * requests here. This does not grant permission: the browser may still ask the
 * user, and standard CORS must also allow the page's exact origin.
 */
export function installLoopbackFetchSupport(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let requestUrl: string
    if (typeof input === 'string') requestUrl = input
    else if (input instanceof URL) requestUrl = input.href
    else requestUrl = input.url

    let isLoopback = false
    try {
      const hostname = new URL(requestUrl, window.location.href).hostname.toLowerCase()
      isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
    } catch {
      // Leave malformed or unsupported URLs to the original fetch implementation.
    }

    if (!isLoopback) return originalFetch(input, init)

    const options = { ...init, targetAddressSpace: 'loopback' } as RequestInitWithAddressSpace
    return originalFetch(input, options)
  }) as typeof window.fetch
}
