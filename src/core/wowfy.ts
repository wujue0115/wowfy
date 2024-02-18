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
    options: TEffectOptions
  ) {
    this._effectInstance = new EffectInstances[this._effect](
      this._element,
      options
    );
    this._effectInstance.setEffect();
  }

  // [Getter ans Setter]
  get effect() {
    return this._effect;
  }

  get options() {
    return this._effectInstance.options;
  }

  // [Methods]
  // [Methods] Public methods
  public update(effect: TEffect, options: TEffectOptions) {
    if (effect !== this._effect) {
      this._effectInstance.destroy();
      this._effectInstance = new EffectInstances[effect as TEffect](
        this._element,
        options
      );
    }

    this._effectInstance.update(options);
    this._effectInstance.setEffect();
  }

  public destroy() {
    this._effectInstance.destroy();
    this._element = null;
    this._effect = null;
  }
}
