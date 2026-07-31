import { createEvent } from './event.js'
import { HttpBatchTransport } from './http-transport.js'
import type { ApirelioClientOptions, ApirelioEvent, CaptureContext, EventTransport } from './types.js'

const DEFAULTS = {
  endpoint: 'https://apirelio.com',
  environment: 'production' as const,
  enabled: true,
  batchSize: 100,
  flushIntervalMs: 5_000,
  maxQueueSize: 10_000,
  timeoutMs: 2_000,
  maxRetries: 2,
  metadataKeys: [] as readonly string[],
}

export class ApirelioClient {
  private readonly options: Required<Omit<ApirelioClientOptions, 'transport' | 'release' | 'onError' | 'onDropped'>> & {
    release: string | null
    onError?: (error: unknown) => void
    onDropped?: (event: ApirelioEvent, totalDropped: number) => void
  }

  private readonly transport: EventTransport
  private readonly queue: ApirelioEvent[] = []
  private readonly timer: NodeJS.Timeout
  private inFlight: Promise<void> | null = null
  private closed = false
  private dropped = 0

  public constructor(options: ApirelioClientOptions) {
    this.options = {
      ...DEFAULTS,
      ...options,
      release: options.release ?? null,
      batchSize: clamp(options.batchSize ?? DEFAULTS.batchSize, 1, 500),
      flushIntervalMs: Math.max(100, options.flushIntervalMs ?? DEFAULTS.flushIntervalMs),
      maxQueueSize: Math.max(1, options.maxQueueSize ?? DEFAULTS.maxQueueSize),
      timeoutMs: Math.max(100, options.timeoutMs ?? DEFAULTS.timeoutMs),
      maxRetries: clamp(options.maxRetries ?? DEFAULTS.maxRetries, 0, 10),
      metadataKeys: options.metadataKeys ?? DEFAULTS.metadataKeys,
    }

    this.transport = options.transport ?? new HttpBatchTransport({
      endpoint: this.options.endpoint,
      apiKey: this.options.apiKey,
      timeoutMs: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
    })

    this.timer = setInterval(() => {
      if (this.queue.length > 0) void this.flush().catch(error => this.report(error))
    }, this.options.flushIntervalMs)
    this.timer.unref()
  }

  public capture(context: CaptureContext): boolean {
    if (this.closed || !this.options.enabled || this.options.apiKey.length === 0) return false

    const event = createEvent(context, this.options)
    if (this.queue.length >= this.options.maxQueueSize) {
      this.dropped++
      this.options.onDropped?.(event, this.dropped)
      return false
    }

    this.queue.push(event)
    if (this.queue.length >= this.options.batchSize) {
      queueMicrotask(() => void this.flush().catch(error => this.report(error)))
    }

    return true
  }

  public get pendingCount(): number {
    return this.queue.length
  }

  public get droppedCount(): number {
    return this.dropped
  }

  public flush(): Promise<void> {
    if (this.inFlight !== null) return this.inFlight

    this.inFlight = this.drain().finally(() => {
      this.inFlight = null
    })
    return this.inFlight
  }

  public async shutdown(timeoutMs = 5_000): Promise<void> {
    if (this.closed) return
    this.closed = true
    clearInterval(this.timer)

    let timeout: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.flush(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Apirelio shutdown flush timed out.')), timeoutMs)
          timeout.unref()
        }),
      ])
    }
    finally {
      if (timeout !== undefined) clearTimeout(timeout)
    }
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.options.batchSize)
      try {
        await this.transport.send(batch)
      }
      catch (error) {
        this.queue.unshift(...batch)
        while (this.queue.length > this.options.maxQueueSize) {
          const dropped = this.queue.pop()
          if (dropped === undefined) break
          this.dropped++
          this.options.onDropped?.(dropped, this.dropped)
        }
        throw error
      }
    }
  }

  private report(error: unknown): void {
    try {
      this.options.onError?.(error)
    }
    catch {
      // Observability must never alter the observed application.
    }
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}
