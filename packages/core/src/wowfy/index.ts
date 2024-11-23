import type {
  AnyEffect,
  BaseContext,
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
  Options extends BaseOptions = BaseOptions,
  Context extends BaseContext<Options> = CoreContext<Options>,
>(
  effectController: EffectController<Effect, Options, Context>,
  contextCreator?: ContextCreator<Context, Options>,
) {
  return (el: BaseElements, options?: Options): Effect => {
    const context = (contextCreator ?? createCoreContext)(el, options) as Context
    const effect = effectController(context)
    effect.create()
    return effect
  }
}
