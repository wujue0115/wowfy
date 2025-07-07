import type {
  BaseContext,
  BaseElements,
  CoreContext,
} from '../types'
import { createEventManager, createStateManager } from '../managers'
import { logger } from '../logger'

export function resolveElements(el: BaseElements): HTMLElement[] {
  if (typeof el === 'string') {
    return resolveElements(document.querySelectorAll<HTMLElement>(el))
  }
  if (el instanceof NodeList || el instanceof HTMLCollection) {
    return Array.from(el).filter(node => node instanceof HTMLElement)
  }
  return ([] as HTMLElement[]).concat(el)
}

export function createBaseContext<Options>(el: BaseElements, options?: Options): BaseContext<Options> {
  const els = resolveElements(el)

  !els.length && logger.warn('No elements found. Please check the selector or create the effect when the dom is ready.')

  return {
    els,
    options,
  }
}

export function createCoreContext<Options>(el: BaseElements, options?: Options): CoreContext<Options> {
  return {
    ...createBaseContext(el, options),
    state: createStateManager(),
    event: createEventManager(),
  }
}
