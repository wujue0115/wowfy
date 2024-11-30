import type {
  BaseContext,
  BaseElements,
  CoreContext,
} from '../types'
import { createEventManager, createStateManager } from '../managers'

function resolveElements(el: BaseElements): HTMLElement[] | Node[] {
  if (typeof el === 'string') {
    return resolveElements(document.querySelectorAll(el))
  }
  if (el instanceof NodeList || el instanceof HTMLCollection) {
    return Array.from(el)
  }
  return ([] as HTMLElement[]).concat(el)
}

export function createBaseContext<Options>(el: BaseElements, options?: Options): BaseContext<Options> {
  return {
    els: resolveElements(el),
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
