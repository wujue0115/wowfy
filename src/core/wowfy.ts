import type { TEffect, TEffectOptions } from "./types";
import { Ripple } from "../effects/index";

const EffectInstances = {
  ripple: Ripple
};

export class Wowfy {
  private _effectInstance: Ripple | null = null;

  constructor(
    private _element: HTMLElement,
    private _effect: TEffect,
    option: TEffectOptions
  ) {
    this._effectInstance = new EffectInstances[this._effect](
      this._element,
      option
    );
    this._effectInstance.setEffect();
  }

  // [Getter ans Setter]
  get effect() {
    return this._effect;
  }

  get option() {
    return this._effectInstance.option;
  }

  // [Methods]
  // [Methods] Public methods
  public update(effect: TEffect, option: TEffectOptions) {
    if (effect !== this._effect) {
      this._effectInstance.destroy();
      this._effectInstance = new EffectInstances[effect as TEffect](
        this._element,
        option
      );
    }

    this._effectInstance.update(option);
    this._effectInstance.setEffect();
  }

  public destroy() {
    this._effectInstance.destroy();
    this._element = null;
    this._effect = null;
  }
}
