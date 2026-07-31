export type MetadataValue = boolean | number | string | null
export type Metadata = Record<string, MetadataValue>

export type ApirelioEnvironment = 'production' | 'staging' | 'development' | 'test' | 'local'

export interface ApirelioCustomer {
  id: string
  name?: string | null
  plan?: string | null
}

export interface ApirelioApplication {
  id: string
  name?: string | null
}

export interface CaptureContext {
  method: string
  route: string
  routeName?: string | null
  status: number
  durationMs: number
  requestBytes?: number | null
  responseBytes?: number | null
  customer?: ApirelioCustomer | null
  application?: ApirelioApplication | null
  apiVersion?: string | null
  sdk: string
  sdkVersion: string
  errorCode?: string | null
  metadata?: Metadata
}

export interface ApirelioEvent {
  event_id: string
  occurred_at: string
  service: string
  environment: ApirelioEnvironment
  method: string
  route: string
  route_name: string | null
  status: number
  duration_ms: number
  request_bytes: number | null
  response_bytes: number | null
  customer_id: string | null
  customer_name: string | null
  customer_plan: string | null
  application_id: string | null
  application_name: string | null
  api_version: string | null
  sdk: string
  sdk_version: string
  release: string | null
  error_code: string | null
  metadata: Metadata
}

export interface EventTransport {
  send(events: readonly ApirelioEvent[]): Promise<void>
}

export interface ApirelioClientOptions {
  apiKey: string
  service: string
  endpoint?: string
  environment?: ApirelioEnvironment
  release?: string | null
  enabled?: boolean
  batchSize?: number
  flushIntervalMs?: number
  maxQueueSize?: number
  timeoutMs?: number
  maxRetries?: number
  metadataKeys?: readonly string[]
  transport?: EventTransport
  onError?: (error: unknown) => void
  onDropped?: (event: ApirelioEvent, totalDropped: number) => void
}
