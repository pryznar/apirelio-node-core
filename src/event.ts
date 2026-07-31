import { randomUUID } from 'node:crypto'
import { sanitizeMetadata } from './metadata.js'
import { normalizeRoute } from './route.js'
import type { ApirelioClientOptions, ApirelioEvent, CaptureContext } from './types.js'

type EventDefaults = Pick<Required<ApirelioClientOptions>, 'service' | 'environment' | 'metadataKeys'> & {
  release: string | null
}

export function createEvent(context: CaptureContext, defaults: EventDefaults): ApirelioEvent {
  return {
    event_id: randomUUID(),
    occurred_at: new Date().toISOString(),
    service: truncate(defaults.service, 120) ?? 'node-api',
    environment: defaults.environment,
    method: truncate(context.method.toUpperCase(), 16) ?? 'GET',
    route: normalizeRoute(context.route),
    route_name: truncate(context.routeName, 255),
    status: clampInteger(context.status, 100, 599),
    duration_ms: clampInteger(context.durationMs, 0, 4_294_967_295),
    request_bytes: nullableInteger(context.requestBytes),
    response_bytes: nullableInteger(context.responseBytes),
    customer_id: truncate(context.customer?.id, 255),
    customer_name: truncate(context.customer?.name, 255),
    customer_plan: truncate(context.customer?.plan, 120),
    application_id: truncate(context.application?.id, 255),
    application_name: truncate(context.application?.name, 255),
    api_version: truncate(context.apiVersion, 120),
    sdk: truncate(context.sdk, 120) ?? 'node',
    sdk_version: truncate(context.sdkVersion, 120) ?? '0.0.0',
    release: truncate(defaults.release, 255),
    error_code: truncate(context.errorCode, 255),
    metadata: sanitizeMetadata(context.metadata, defaults.metadataKeys),
  }
}

function truncate(value: string | null | undefined, length: number): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  return value.slice(0, length)
}

function nullableInteger(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : clampInteger(value, 0, 4_294_967_295)
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}
