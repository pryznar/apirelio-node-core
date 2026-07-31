export { ApirelioClient } from './client.js'
export { createEvent } from './event.js'
export { HttpBatchTransport, IngestionError } from './http-transport.js'
export { sanitizeMetadata } from './metadata.js'
export { installProcessHooks } from './process-hooks.js'
export { joinRoute, normalizeRoute } from './route.js'
export type { HttpBatchTransportOptions } from './http-transport.js'
export type { ProcessHookOptions } from './process-hooks.js'
export type {
  ApirelioApplication,
  ApirelioClientOptions,
  ApirelioCustomer,
  ApirelioEnvironment,
  ApirelioEvent,
  CaptureContext,
  EventTransport,
  Metadata,
  MetadataValue,
} from './types.js'
