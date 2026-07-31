import type { ApirelioEvent, EventTransport } from './types.js'

export interface HttpBatchTransportOptions {
  endpoint: string
  apiKey: string
  timeoutMs: number
  maxRetries: number
  fetch?: typeof globalThis.fetch
}

export class IngestionError extends Error {
  public constructor(message: string, public readonly status?: number) {
    super(message)
    this.name = 'IngestionError'
  }
}

export class HttpBatchTransport implements EventTransport {
  private readonly fetchImplementation: typeof globalThis.fetch

  public constructor(private readonly options: HttpBatchTransportOptions) {
    this.fetchImplementation = options.fetch ?? globalThis.fetch
    if (typeof this.fetchImplementation !== 'function') {
      throw new Error('Apirelio requires a Fetch API implementation.')
    }
  }

  public async send(events: readonly ApirelioEvent[]): Promise<void> {
    if (events.length === 0) return

    let lastError: unknown
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const response = await this.fetchImplementation(
          `${this.options.endpoint.replace(/\/$/, '')}/ingest/v1/events/batch`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${this.options.apiKey}`,
              'content-type': 'application/json',
              'user-agent': '@apirelio/core/0.1.0',
            },
            body: JSON.stringify({ events }),
            signal: AbortSignal.timeout(this.options.timeoutMs),
          },
        )

        if (response.ok) return
        const error = new IngestionError(`Apirelio ingestion returned HTTP ${response.status}.`, response.status)
        if (response.status < 500 && response.status !== 429) throw error
        lastError = error
      }
      catch (error) {
        lastError = error
        if (error instanceof IngestionError && error.status !== 429 && (error.status ?? 500) < 500) throw error
      }

      if (attempt < this.options.maxRetries) await delay(100 * 2 ** attempt)
    }

    throw lastError instanceof Error ? lastError : new IngestionError('Unable to deliver Apirelio events.')
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}
