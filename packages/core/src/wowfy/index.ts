import type {
  AnyEffect,
  BaseEffect,
  BaseElements,
  BaseOptions,
  ContextCreator,
  CoreContext,
  EffectController,
} from '../types'
import { createCoreContext } from '../contexts'

export function createWowfy<
  Effect extends BaseEffect = AnyEffect,
  Options = BaseOptions,
  Context = CoreContext<Options>,
>(
  effectController: EffectController<Effect, Context>,
  contextCreator?: ContextCreator<Context, Options>,
) {
  return (el: BaseElements, options?: Options): Effect => {
    const context = (contextCreator ?? createCoreContext)(el, options) as Context
    const effect = effectController(context)
    effect.create()
    return effect
  }
}
