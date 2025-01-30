import type {
  AnyEffect,
  BaseEffect,
  BaseEffectCreator,
  BaseElements,
  BaseOptions,
  ContextCreator,
  CoreContext,
  EffectController,
  WowfyInitialOptions,
} from '../types'
import { createCoreContext, resolveElements } from '../contexts'

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

export function createWowfyInitializer<
  Effect extends BaseEffect,
  Options extends BaseOptions,
  EffectCreator extends BaseEffectCreator<Effect, Options>,
>(
  initialOptions: WowfyInitialOptions<Effect, Options, EffectCreator>,
) {
  return (customDefaultOptions: Partial<{ prefix: string } & Options> = {}): { destroy: () => void } => {
    const { prefix = customDefaultOptions?.prefix ?? 'w', effectName, effectCreator, defaultOptions } = initialOptions

    const camelToKebab = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

    const resolveOptions = (el: HTMLElement) => {
      const nameOptions = JSON.parse(el.getAttribute(`${prefix}-${effectName}`) || '{}')
      const options: Partial<Options> = {}

      for (const key of Object.keys(defaultOptions)) {
        const attrKey = `${prefix}-${camelToKebab(key)}`
        options[key as keyof Options]
          = nameOptions[key]
          ?? el.getAttribute(attrKey)
          ?? customDefaultOptions[key]
          ?? defaultOptions[key]
      }

      return options
    }

    const els = resolveElements(`[${prefix}-${effectName}]`)
    const effects = els.map((el) => {
      const effect = effectCreator(el, resolveOptions(el) as Options)
      effect.mount()
      return effect
    })

    return {
      destroy: () => {
        effects.forEach(effect => effect.destroy())
      },
    }
  }
}
