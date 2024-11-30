import type { BaseEffect } from '@wowfy/core'
import { createWowfy } from '@wowfy/core'

import type { RippleOptions } from '@wowfy/effects'
import { createRippleController } from '@wowfy/effects'

const createRipple = createWowfy<BaseEffect, Partial<RippleOptions>>(createRippleController)

export * from '@wowfy/core'
export { createRipple }
