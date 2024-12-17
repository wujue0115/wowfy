import { createWowfy } from '@wowfy/core'

import type { RippleEffect, RippleOptions } from '@wowfy/effects'
import { createRippleController } from '@wowfy/effects'

const createRipple = createWowfy<RippleEffect, Partial<RippleOptions>>(createRippleController)

export * from '@wowfy/core'
export * from '@wowfy/effects'
export { createRipple }
