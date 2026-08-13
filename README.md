# Apirelio Node.js Core

[![npm](https://img.shields.io/npm/v/%40apirelio%2Fcore?style=flat-square&logo=npm)](https://www.npmjs.com/package/@apirelio/core)
[![Live demo](https://img.shields.io/badge/live_demo-explore-8EF0B5?style=flat-square&logo=googlechrome&logoColor=0B0E10)](https://apirelio.com/demo?utm_source=github&utm_medium=readme&utm_campaign=node-core)

## See the customer behind every API request

[![Apirelio live demo dashboard](https://apirelio.com/img/apirelio-live-demo-dashboard.jpg)](https://apirelio.com/demo?utm_source=github&utm_medium=readme&utm_campaign=node-core)

Follow a release regression from the failing endpoint to the exact customer accounts it affects in the public, read-only workspace.

**[Explore the live demo →](https://apirelio.com/demo?utm_source=github&utm_medium=readme&utm_campaign=node-core)**

## Try it in 30 seconds

```bash
npm install @apirelio/core
export APIRELIO_API_KEY=apr_live_your_project_key
```

Copy the minimal setup below or run the [quickstart example](./examples/quickstart). Delivery is fail-safe and no request or response payloads are captured.


[Documentation](https://apirelio.com/docs/typescript) · [npm](https://www.npmjs.com/package/@apirelio/core) · [Apirelio](https://apirelio.com)

> Build customer-aware Node.js API monitoring integrations with bounded asynchronous delivery and no payload capture.

Fail-safe asynchronous delivery core shared by the official Express, Fastify and NestJS SDKs.
It creates the same customer-aware event contract as the PHP SDKs without capturing bodies,
credentials, cookies, query strings, email addresses or IP addresses.

## Installation

```bash
npm install @apirelio/core
```

Applications normally install a framework adapter instead of using Core directly.

```ts
import { ApirelioClient, installProcessHooks } from '@apirelio/core'

const apirelio = new ApirelioClient({
  apiKey: process.env.APIRELIO_API_KEY ?? '',
  endpoint: process.env.APIRELIO_ENDPOINT ?? 'https://apirelio.com',
  service: 'billing-api',
  environment: 'production',
  release: process.env.APP_RELEASE,
  metadataKeys: ['region'],
})

const removeHooks = installProcessHooks(apirelio)
```

`capture()` only validates and enqueues an event. A bounded in-memory queue sends batches in the
background every five seconds or after 100 events. Network failures never affect the observed API
response. The queue is intentionally bounded; overload drops new telemetry instead of consuming
unbounded memory.

Call `await apirelio.shutdown()` during graceful application shutdown. In serverless runtimes use
an external durable queue or explicitly flush before the runtime freezes the process.

## Route filtering

Framework adapters use the shared `shouldCaptureRoute()` matcher. Patterns are either exact paths
such as `/api/health` or bounded prefixes ending in `/**`, such as `/api/**`. Exclusions always win;
an omitted or empty include list matches every route.

## Defaults

| Option | Default |
| --- | --- |
| endpoint | `https://apirelio.com` |
| batch size | `100` (maximum `500`) |
| flush interval | `5000ms` |
| maximum queue | `10000` events |
| HTTP timeout | `2000ms` |
| retries | `2` |

## Privacy

Metadata is opt-in through `metadataKeys`, limited to 20 scalar values and 4 KB. Sensitive key
fragments such as `authorization`, `cookie`, `password`, `token`, `secret`, `email` and `ip` are
always discarded. Concrete numeric, UUID, ULID and long hexadecimal route segments are normalized.
