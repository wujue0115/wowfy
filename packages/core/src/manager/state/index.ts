import type { State } from '../../types'

export function createStateManager(initialState?: string): State {
  const state = new Set<string>()

  initialState && state.add(initialState)

  const get = () => {
    return Array.from(state)
  }

  const set = (value: string | string[], reset = true) => {
    reset && state.clear()
    Array.isArray(value) ? value.forEach(v => state.add(v)) : state.add(value)
  }

  const is = (value: string | string[]) => {
    return Array.isArray(value) ? value.every(v => state.has(v)) : state.has(value)
  }

  return {
    get,
    set,
    is,
  }
}
