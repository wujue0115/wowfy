import type { AnyFunction, StateInstance, StateKey } from '../../types'

export function createStateManager(): StateInstance {
  const stateMap = new Map<StateKey, boolean>()
  const stateEventMap = new Map<StateKey, {
    on?: AnyFunction
    un?: AnyFunction
  }>()

  const trigger = (key: StateKey, newValue: boolean) => {
    const stateEvent = stateEventMap.get(key)
    if (!stateEvent) return

    const oldValue = stateMap.get(key)
    const isTriggerOn = oldValue !== undefined && !oldValue && newValue
    const isTriggerUn = oldValue !== undefined && oldValue && !newValue

    isTriggerOn && stateEvent.on && stateEvent.on()
    isTriggerUn && stateEvent.un && stateEvent.un()
  }

  const get = () => {
    return Array.from(stateMap.keys()).filter(k => stateMap.get(k))
  }

  const set = (key: StateKey | StateKey[], value: boolean | boolean[] = true) => {
    if (Array.isArray(key)) {
      key.forEach((k, i) => {
        const newValue = Array.isArray(value) ? value[i] : value
        stateMap.set(k, newValue)
        trigger(k, newValue)
      })
    } else {
      const newValue = Array.isArray(value) ? value[0] : value
      stateMap.set(key, newValue)
      trigger(key, newValue)
    }
  }

  const add = (key: StateKey | StateKey[]) => {
    set(key, false)
  }

  const is = (key: StateKey | StateKey[]) => {
    return Array.isArray(key) ? key.every(v => stateMap.has(v)) : stateMap.has(key)
  }

  const remove = (key: StateKey | StateKey[]) => {
    Array.isArray(key)
      ? key.forEach((k) => {
        stateMap.delete(k)
        stateEventMap.delete(k)
      })
      : (stateMap.delete(key), stateEventMap.delete(key))
  }

  const on = (key: StateKey, handler: AnyFunction) => {
    if (!stateMap.has(key)) throw new Error(`[State Manager] state key "${String(key)}" not found`)
    const stateEvent = stateEventMap.get(key) ?? {}
    stateEventMap.set(key, { ...stateEvent, on: handler })
  }

  const un = (key: StateKey, handler: AnyFunction) => {
    if (!stateMap.has(key)) throw new Error(`[State Manager] state key "${String(key)}" not found`)
    const stateEvent = stateEventMap.get(key) ?? {}
    stateEventMap.set(key, { ...stateEvent, un: handler })
  }

  const off = (key: StateKey, handlerType: 'on' | 'un') => {
    if (!stateMap.has(key)) throw new Error(`[State Manager] state key "${String(key)}" not found`)
    const stateEvent = stateEventMap.get(key) ?? {}
    delete stateEvent[handlerType]
  }

  return {
    get,
    set,
    add,
    is,
    remove,
    on,
    un,
    off,
  }
}
