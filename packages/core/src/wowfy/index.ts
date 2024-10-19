import type {
  EffectFactory,
  ExtendedEffect,
  TargetElements,
} from '../types'
import { createStateManager } from '../manager/state'

function parseToEls(el: TargetElements): HTMLElement[] | Node[] {
  if (typeof el === 'string') {
    return parseToEls(document.querySelectorAll(el))
  }
  if (el instanceof NodeList || el instanceof HTMLCollection) {
    return Array.from(el)
  }
  return ([] as HTMLElement[]).concat(el)
}

export function createWowfy<Effect extends ExtendedEffect = ExtendedEffect, Options = Record<string, any>>(effectFactory: EffectFactory<Effect, Options>) {
  return (el: TargetElements, options: Options): Effect => {
    const context = { els: parseToEls(el), options, createStateManager }
    const effect = effectFactory(context)
    effect.create()
    return effect
  }
}
