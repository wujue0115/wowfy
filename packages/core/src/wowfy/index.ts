import type {
  AnyEffect,
  BaseElements,
  BaseOptions,
  ContextCreator,
  EffectController,
} from '../types'
import { createCoreContext } from '../contexts'

export function createWowfy<
  Effect extends AnyEffect = AnyEffect,
  Options = BaseOptions,
>(
  effectController: EffectController<Effect, Options>,
  contextCreator: ContextCreator<Options> = createCoreContext<Options>,
) {
  return (el: BaseElements, options?: Options): Effect => {
    const effect = effectController(contextCreator(el, options))
    effect.create()
    return effect
  }
}
