import { describe, expect, it, vi } from 'vitest'
import { HttpBatchTransport } from '../src/index.js'
import type { ApirelioEvent } from '../src/index.js'

describe('HttpBatchTransport', () => {
  it('posts batches to the production ingestion endpoint', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('', { status: 202 }))
    const transport = new HttpBatchTransport({
      endpoint: 'https://apirelio.com/',
      apiKey: 'apr_test',
      timeoutMs: 1_000,
      maxRetries: 0,
      fetch,
    })

    await transport.send([event()])

    expect(fetch).toHaveBeenCalledWith(
      'https://apirelio.com/ingest/v1/events/batch',
      expect.objectContaining({ method: 'POST' }),
    )
    const request = fetch.mock.calls[0]?.[1]
    expect(request?.headers).toMatchObject({ authorization: 'Bearer apr_test' })
  })

  it('retries transient failures', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 202 }))
    const transport = new HttpBatchTransport({
      endpoint: 'https://apirelio.com',
      apiKey: 'apr_test',
      timeoutMs: 1_000,
      maxRetries: 1,
      fetch,
    })

    await transport.send([event()])
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

function event(): ApirelioEvent {
  return {
    event_id: 'event-1', occurred_at: new Date().toISOString(), service: 'api', environment: 'test',
    method: 'GET', route: '/', route_name: null, status: 200, duration_ms: 1,
    request_bytes: null, response_bytes: null, customer_id: null, customer_name: null,
    customer_plan: null, application_id: null, application_name: null, api_version: null,
    sdk: 'node', sdk_version: '0.1.0', release: null, error_code: null, metadata: {},
  }
}
