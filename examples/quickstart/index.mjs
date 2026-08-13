import { ApirelioClient } from '@apirelio/core'

const client = new ApirelioClient({
  apiKey: process.env.APIRELIO_API_KEY ?? '',
  service: 'github-quickstart',
  environment: 'development',
})
client.capture({
  method: 'GET',
  route: '/api/invoices/{id}',
  status: 200,
  durationMs: 24,
  sdk: 'github-quickstart',
  sdkVersion: '1.0.0',
  customer: { id: 'customer_42', name: 'Acme Europe', plan: 'growth' },
})
await client.shutdown()
console.log('One privacy-safe demo event queued.')
