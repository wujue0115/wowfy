export interface State {
  get: () => string[];
  set: (value: string | string[], reset?: boolean) => void;
  is: (value: string | string[]) => boolean;
}

export type StateManager = (initialState?: string) => State;

export type TargetElements = string | HTMLElement | HTMLElement[] | NodeList | HTMLCollection;

export interface BaseEffect {
  create: () => void;
  mount: () => void;
  destroy: () => void;
}

export interface ExtendedEffect extends BaseEffect {
  [key: string]: (...args: any) => any;
}

export interface EffectContext<Options = object> {
  els: HTMLElement[] | Node[];
  options: Options;
  createStateManager: StateManager;
}

export type EffectFactory<Effect extends ExtendedEffect = ExtendedEffect, Options = Record<string, any>> = (context: EffectContext<Options>) => Effect;