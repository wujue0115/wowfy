export type StateKey = string | number | symbol

export interface StateInstance {
  get: () => StateKey[]
  set: (key: StateKey | StateKey[], value?: boolean | boolean[]) => void
  add: (key: StateKey | StateKey[]) => void
  is: (value: string | string[]) => boolean
  remove: (key: StateKey | StateKey[]) => void
  on: (key: StateKey, handler: AnyFunction) => void
  un: (key: StateKey, handler: AnyFunction) => void
  off: (key: StateKey, handlerType: 'on' | 'un') => void
}

export type StateManager = () => StateInstance

export interface EventInstance {
  on: (key: string, handler: AnyFunction) => void
  off: (key: string, handler: AnyFunction) => void
  emit: (key: string, ...args: any) => void
}

export type EventManager = () => EventInstance

export type BaseElements = string | HTMLElement | HTMLElement[] | NodeList | HTMLCollection

export type BaseOptions = Record<string, any>

export interface BaseEffect {
  create: () => void
  mount: () => void
  destroy: () => void
}

export interface AnyEffect extends BaseEffect {
  [key: string]: (...args: any) => any
}

export interface BaseContext<Options> {
  els: HTMLElement[]
  options?: Options
}

export interface AnyContext<Options> extends BaseContext<Options> {
  [key: string]: any
}

export interface CoreContext<Options> extends BaseContext<Options> {
  state: StateInstance
  event: EventInstance
}

export type ContextCreator<Context, Options> = (el: BaseElements, options?: Options) => Context

export type EffectController<Effect extends BaseEffect, Context> = (context: Context) => Effect

export type AnyFunction = (...args: any) => any

export type BaseEffectCreator<Effect extends BaseEffect, Options extends BaseOptions> = (el: BaseElements, options?: Options) => Effect

export interface WowfyInitialOptions<Effect extends BaseEffect, Options extends BaseOptions, EffectCreator extends BaseEffectCreator<Effect, Options>> {
  prefix?: string
  effectName: string
  defaultOptions: Options
  effectCreator: EffectCreator
}
