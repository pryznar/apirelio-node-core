import type { ApirelioClient } from './client.js'

export interface ProcessHookOptions {
  signals?: readonly NodeJS.Signals[]
  timeoutMs?: number
}

export function installProcessHooks(client: ApirelioClient, options: ProcessHookOptions = {}): () => void {
  const signals = options.signals ?? ['SIGINT', 'SIGTERM']
  const handlers = new Map<NodeJS.Signals, () => void>()

  for (const signal of signals) {
    const handler = (): void => {
      void client.shutdown(options.timeoutMs).finally(() => {
        cleanup()
        process.kill(process.pid, signal)
      })
    }
    handlers.set(signal, handler)
    process.once(signal, handler)
  }

  const beforeExit = (): void => {
    void client.shutdown(options.timeoutMs)
  }
  process.once('beforeExit', beforeExit)

  const cleanup = (): void => {
    process.off('beforeExit', beforeExit)
    for (const [signal, handler] of handlers) process.off(signal, handler)
  }

  return cleanup
}
