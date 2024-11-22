export type StateKey = string | number | symbol

export interface State {
  get: () => StateKey[]
  set: (key: StateKey | StateKey[], value?: boolean | boolean[]) => void
  add: (key: StateKey | StateKey[]) => void
  is: (value: string | string[]) => boolean
  remove: (key: StateKey | StateKey[]) => void
  on: (key: StateKey, handler: AnyFunction) => void
  un: (key: StateKey, handler: AnyFunction) => void
  off: (key: StateKey, handlerType: 'on' | 'un') => void
}

export type StateManager = () => State

export interface Event {
  on: (key: string, handler: AnyFunction) => void
  off: (key: string, handler: AnyFunction) => void
  emit: (key: string, ...args: any) => void
}

export type EventManager = () => Event

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

export interface BaseContext<Options = BaseOptions> {
  els: HTMLElement[] | Node[]
  options?: Options
}

export interface AnyContext<Options = BaseOptions> extends BaseContext<Options> {
  [key: string]: any
}

export interface CoreContext<Options = BaseOptions> extends AnyContext<Options> {
  state: State
  event: Event
}

export type ContextCreator<Options = BaseOptions> = (el: BaseElements, options?: Options) => CoreContext<Options>

export type EffectController<Effect extends AnyEffect = AnyEffect, Options = BaseOptions> = (context: AnyContext<Options>) => Effect

export type AnyFunction = (...args: any) => any
