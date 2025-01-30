import { createWowfy, createWowfyInitializer } from '@wowfy/core'

import type { RippleEffect, RippleOptions } from '@wowfy/effects'
import { createRippleController, defaultRippleOptions } from '@wowfy/effects'

const createRipple = createWowfy<RippleEffect, Partial<RippleOptions>>(createRippleController)
const rippleInit = createWowfyInitializer<RippleEffect, RippleOptions, typeof createRipple>({
  effectName: 'ripple',
  defaultOptions: defaultRippleOptions,
  effectCreator: createRipple,
})

export * from '@wowfy/core'
export * from '@wowfy/effects'
export { createRipple, rippleInit }
