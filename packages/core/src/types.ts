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

export type TargetElements = string | HTMLElement | HTMLElement[] | NodeList | HTMLCollection

export interface BaseEffect {
  create: () => void
  mount: () => void
  destroy: () => void
}

export interface ExtendedEffect extends BaseEffect {
  [key: string]: (...args: any) => any
}

export interface EffectContext<Options = Record<string, any>> {
  els: HTMLElement[] | Node[]
  options?: Options
  createStateManager: StateManager
  createEventManager: EventManager
}

export type EffectController<Effect extends ExtendedEffect = ExtendedEffect, Options = Record<string, any>> = (context: EffectContext<Options>) => Effect

export type AnyFunction = (...args: any) => any
