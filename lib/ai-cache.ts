type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type CacheStore = Map<string, CacheEntry<unknown>>

declare global {
  var __ketoFlowCache__: CacheStore | undefined
}

function getStore() {
  if (!globalThis.__ketoFlowCache__) {
    globalThis.__ketoFlowCache__ = new Map()
  }

  return globalThis.__ketoFlowCache__
}

export function getCachedValue<T>(key: string) {
  const store = getStore()
  const entry = store.get(key)

  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }

  return entry.value as T
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  const store = getStore()
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })

  return value
}

export function buildCacheKey(namespace: string, payload: unknown) {
  return `${namespace}:${JSON.stringify(payload)}`
}
