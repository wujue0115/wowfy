import type { BaseEffect, CoreContext } from '@wowfy/core'
import type { RippleOptions } from '../../types'
import { isValidTimeFormat } from '../../utils'

const defaulRippleOptions: RippleOptions = {
  event: 'mousedown',
  background: '#ff98cfaa',
  duration: '500ms',
  timingFunction: 'ease-in',
  mode: 'unkeep',
  position: 'cs',
  delay: '0ms',
  size: false,
  sizeRatio: 1,
  repeatCount: 1,
  repeatInterval: '0ms',
  maxCount: 10,
  outline: '',
  boxShadow: '',
}

function validOptions(options: RippleOptions) {
  const times = ['duration', 'delay', 'repeatInterval']
  for (const time of times) {
    if (!isValidTimeFormat(options[time])) {
      throw new Error(`"${options[time]}" is an invalid time format.`)
    }
  }
}

function resolveOptions(contextOptions?: RippleOptions) {
  return {
    ...defaulRippleOptions,
    ...contextOptions,
  }
}

export function createRippleController(context: CoreContext<RippleOptions>): BaseEffect {
  const options = resolveOptions(context.options)

  validOptions(options)

  return {
    create() {

    },
    mount() {

    },
    destroy() {

    },
  }
}
