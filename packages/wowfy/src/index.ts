import { createWowfy, createWowfyInitializer } from '@wowfy/core'

import type { RippleEffect, RippleOptions, StringArtEffect, StringArtOptions } from '@wowfy/effects'
import { createRippleController, createStringArtController, defaultRippleOptions } from '@wowfy/effects'

const createRipple = createWowfy<RippleEffect, Partial<RippleOptions>>(createRippleController)
const initRipple = createWowfyInitializer<RippleEffect, RippleOptions, typeof createRipple>({
  effectName: 'ripple',
  defaultOptions: defaultRippleOptions,
  effectCreator: createRipple,
})

const createStringArt = createWowfy<StringArtEffect, Partial<StringArtOptions>>(createStringArtController)

export * from '@wowfy/core'
export * from '@wowfy/effects'
export { createRipple, createStringArt, initRipple }
