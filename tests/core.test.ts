import { describe, expect, it, vi } from 'vitest'
import { ApirelioClient, createEvent, normalizeRoute, sanitizeMetadata } from '../src/index.js'
import type { ApirelioEvent, EventTransport } from '../src/index.js'

class RecordingTransport implements EventTransport {
  public readonly batches: ApirelioEvent[][] = []

  public async send(events: readonly ApirelioEvent[]): Promise<void> {
    this.batches.push([...events])
  }
}

describe('@apirelio/core', () => {
  it('creates the shared privacy-safe event contract', () => {
    const event = createEvent({
      method: 'post',
      route: '/customers/123/invoices/019c0f25-1211-7a95-b741-e804d1f11bd0?token=secret',
      status: 700,
      durationMs: 42.4,
      customer: { id: 'customer-1', name: 'Acme', plan: 'growth' },
      sdk: 'express',
      sdkVersion: '0.1.0',
      metadata: { region: 'eu', password_hint: 'nope', ignored: 'nope' },
    }, {
      service: 'billing-api',
      environment: 'production',
      release: '2026.07.31.1',
      metadataKeys: ['region', 'password_hint'],
    })

    expect(event.method).toBe('POST')
    expect(event.route).toBe('/customers/{id}/invoices/{id}')
    expect(event.status).toBe(599)
    expect(event.metadata).toEqual({ region: 'eu' })
  })

  it('normalizes concrete identifiers without retaining query strings', () => {
    expect(normalizeRoute('/users/42/orders/01ARZ3NDEKTSV4RRFFQ69G5FAV?email=x')).toBe('/users/{id}/orders/{id}')
  })

  it('enforces metadata allow-list, sensitive keys and payload bounds', () => {
    const metadata = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`safe_${index}`, 'x']))
    const safe = sanitizeMetadata({ ...metadata, authorization_code: 'secret' }, Object.keys(metadata))
    expect(Object.keys(safe)).toHaveLength(20)
    expect(safe).not.toHaveProperty('authorization_code')
    expect(sanitizeMetadata({ score: Number.POSITIVE_INFINITY }, ['score'])).toEqual({})
  })

  it('queues captures without awaiting network and flushes in a batch', async () => {
    const transport = new RecordingTransport()
    const client = new ApirelioClient({
      apiKey: 'apr_test',
      service: 'api',
      batchSize: 2,
      flushIntervalMs: 60_000,
      transport,
    })

    expect(client.capture(context('/one'))).toBe(true)
    expect(client.capture(context('/two'))).toBe(true)
    await vi.waitFor(() => expect(transport.batches).toHaveLength(1))
    expect(transport.batches[0]).toHaveLength(2)
    await client.shutdown()
  })

  it('bounds memory and reports dropped events instead of blocking', async () => {
    const transport = new RecordingTransport()
    const dropped = vi.fn()
    const client = new ApirelioClient({
      apiKey: 'apr_test',
      service: 'api',
      batchSize: 100,
      maxQueueSize: 1,
      flushIntervalMs: 60_000,
      transport,
      onDropped: dropped,
    })

    expect(client.capture(context('/one'))).toBe(true)
    expect(client.capture(context('/two'))).toBe(false)
    expect(client.droppedCount).toBe(1)
    expect(dropped).toHaveBeenCalledOnce()
    await client.shutdown()
  })

  it('keeps the queue bounded when a failed in-flight batch is restored', async () => {
    let rejectBatch: ((error: Error) => void) | undefined
    const transport: EventTransport = {
      send: () => new Promise((_resolve, reject) => { rejectBatch = reject }),
    }
    const client = new ApirelioClient({
      apiKey: 'apr_test', service: 'api', batchSize: 1, maxQueueSize: 2,
      flushIntervalMs: 60_000, transport,
    })

    client.capture(context('/oldest'))
    const flushing = client.flush()
    await vi.waitFor(() => expect(rejectBatch).toBeTypeOf('function'))
    client.capture(context('/newer'))
    client.capture(context('/newest'))
    rejectBatch?.(new Error('offline'))

    await expect(flushing).rejects.toThrow('offline')
    expect(client.pendingCount).toBe(2)
    expect(client.droppedCount).toBe(1)
  })
})

function context(route: string) {
  return {
    method: 'GET',
    route,
    status: 200,
    durationMs: 10,
    sdk: 'node',
    sdkVersion: '0.1.0',
  }
}
