import type { AnyFunction } from '../../types'

export function createEventManager() {
  const eventMap = new Map<string, Set<AnyFunction>>()

  const on = (key: string, handler: AnyFunction) => {
    !eventMap.has(key) && eventMap.set(key, new Set())
    eventMap.get(key)?.add(handler)
  }

  const off = (key: string, handler: AnyFunction) => {
    if (!eventMap.has(key)) return
    eventMap.get(key)?.delete(handler)
  }

  const emit = (key: string, ...args: any) => {
    if (!eventMap.has(key)) return
    eventMap.get(key)?.forEach(handler => handler(...args))
  }

  return {
    on,
    off,
    emit,
  }
}
