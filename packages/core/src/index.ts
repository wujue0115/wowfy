import { createRippleController } from '@wowfy/effects'
import type { RippleOptions } from '@wowfy/effects'
import { createWowfy } from './wowfy'

import type { BaseEffect } from './types'

const createRipple = createWowfy<BaseEffect, RippleOptions>(createRippleController)

export type * from './types'
export type * from '@wowfy/effects'
export {
  createWowfy,
  createRipple,
}
