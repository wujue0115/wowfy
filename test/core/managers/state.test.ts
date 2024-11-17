import { describe, expect, it } from 'vitest'
import { createStateManager } from '../../../packages/core/src/managers'

describe('createStateManager', () => {
  it('should have state key after set', () => {
    const state = createStateManager()

    state.set('mount')
    expect(state.is('mount')).toBe(true)

    state.set(['create', 'mount', 'destroy'])
    expect(state.is(['create', 'mount', 'destroy'])).toBe(true)
  })

  it('should trigger event after set', () => {
    const state = createStateManager()
    let isMount = false

    state.add('mount')
    state.on('mount', () => {
      isMount = true
    })
    state.un('mount', () => {
      isMount = false
    })

    state.set('mount', true)
    expect(isMount).toBe(true)

    state.set('mount', false)
    expect(isMount).toBe(false)
  })

  it('should off event after set', () => {
    const state = createStateManager()
    let isMount = false

    state.add('mount')
    state.on('mount', () => {
      isMount = true
    })
    state.off('mount', 'on')

    state.set('mount', true)
    expect(isMount).toBe(false)
  })
})
