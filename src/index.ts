import { Wowfy } from "./core/index";
import { rippleInit } from "./effects/index";

function wowfyInit() {
  rippleInit();
}

export type * from "./core/types";
export type * from "./effects/types";
export { Wowfy, wowfyInit, rippleInit };
