import type { TRippleOptions } from "./types";
import {
  parseDuration,
  setCSS,
  createElement,
  isValidTimeFormat,
  parseOptionKeyToAttributeName
} from "../utils/helper";

const defaulRippleOptionss: TRippleOptions = {
  event: "mousedown",
  background: "#ff98cfaa",
  duration: "500ms",
  timingFunction: "ease-in",
  mode: "unkeep",
  position: "cs",
  delay: "0ms",
  size: false,
  sizeRatio: 1,
  repeatCount: 1,
  repeatInterval: "0ms",
  maxCount: 10,
  outline: "",
  boxShadow: ""
};

export class Ripple {
  // This property is used to limit the size of the ripple.
  private static readonly rippleSizeThreshold = 2000;
  // This property is used to limit the time threshold of ripple triggering.
  private static readonly rippleTimeThreshold = 50;
  // This property is used to limit the number of ripples.
  private static readonly rippleCountThreshold = 20;
  // This property is used to limit the number of ripple repeat.
  private static readonly rippleRepeatCountThreshold = 5;

  private _rippleWrapper: HTMLElement;
  private _rippleInstances: HTMLElement[] = [];
  private _isListening = false;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private _element: HTMLElement,
    private _options: TRippleOptions
  ) {
    try {
      for (const key in defaulRippleOptionss) {
        this._options[key] ||= defaulRippleOptionss[key];
      }
      this.validateOption();
    } catch (error) {
      console.error(`[Wowfy Error] ${error.message}`);
    }
  }

  // [Getter and Setter]
  get options() {
    return this._options;
  }

  // [Methods]
  // [Methods] Public methods
  public setEffect() {
    if (!this._rippleWrapper) {
      this._rippleWrapper = this.createRippleWrapper();
      // Append ripple wrapper to element children.
      this._element.appendChild(this._rippleWrapper);
    }

    // Set element position to relative when it hasn't been set position.
    setCSS(this._element, {
      position: this._element.style.position || "relative"
    });

    // Remove ripple effect from element when event is triggered.
    this._isListening &&
      this._element.removeEventListener(
        this._options.event,
        this.addMouseRippleEffect
      );
    // Add ripple effect to element when event is triggered.
    this._element.addEventListener(
      this._options.event,
      this.addMouseRippleEffect
    );
    this._isListening = true;
  }

  public update(options: TRippleOptions) {
    try {
      this._options = {
        ...this._options,
        ...options
      };
      this.validateOption();
    } catch (error) {
      console.error(`[Wowfy Error] ${error.message}`);
    }
  }

  public destroy() {
    this._rippleWrapper.remove();
    this._element.removeEventListener(
      this._options.event,
      this.addMouseRippleEffect
    );
    this._isListening = null;
    this._element = null;
    this._options = null;
  }

  // [Methods] Private methods
  // There is a simpler way to validate the options.
  private validateOption() {
    const times = ["duration", "delay", "repeatInterval"];
    for (const time of times) {
      if (!isValidTimeFormat(this._options[time])) {
        throw new Error(`"${this._options[time]}" is an invalid time format.`);
      }
    }
  }

  private createRippleWrapper() {
    return createElement("div", {
      position: "absolute",
      inset: "0",
      borderRadius: "inherit",
      pointerEvents: "none",
      contain: "strict"
    });
  }

  private createRipple(rippleSize: number, x: number, y: number) {
    return createElement("div", {
      width: rippleSize + "px",
      aspectRatio: "1",
      position: "absolute",
      left: `${x - (rippleSize >> 1)}px`,
      top: `${y - (rippleSize >> 1)}px`,
      // There is another way to set the ripple position, but we need to assess its performance compared to the method mentioned above.
      // left: "0",
      // top: "0",
      // translate: `${x - (rippleSize >> 1)}px ${y - (rippleSize >> 1)}px`,
      borderRadius: "50%",
      background: this._options.background,
      outline: this._options.outline,
      boxShadow: this._options.boxShadow
    });
  }

  private getRippleMousePosition(event: MouseEvent) {
    let targetElement = event.target as HTMLElement;
    let offsetTop = 0;
    let offsetLeft = 0;

    while (targetElement !== this._element) {
      offsetTop += targetElement.offsetTop;
      offsetLeft += targetElement.offsetLeft;
      while (targetElement !== this._element) {
        targetElement = targetElement.parentElement;
        if (
          window
            .getComputedStyle(targetElement)
            .getPropertyValue("position") !== "static"
        ) {
          break;
        }
      }
    }

    return { x: event.offsetX + offsetLeft, y: event.offsetY + offsetTop };
  }

  private getRipplePosition(event?: MouseEvent) {
    const positionMapping = {
      "left-top": "top-left",
      "left-bottom": "bottom-left",
      "right-top": "top-right",
      "right-bottom": "bottom-right",
      cs: "cursor",
      ct: "center",
      rd: "random",
      t: "top",
      b: "bottom",
      l: "left",
      r: "right",
      tl: "top-left",
      tr: "top-right",
      bl: "bottom-left",
      br: "bottom-right",
      lt: "top-left",
      lb: "bottom-left",
      rt: "top-right",
      rb: "bottom-right"
    };
    const positions = {
      cursor: this.getRippleMousePosition(event),
      center: {
        x: this._element.offsetWidth >> 1,
        y: this._element.offsetHeight >> 1
      },
      random: {
        x: Math.random() * this._element.offsetWidth,
        y: Math.random() * this._element.offsetHeight
      },
      top: { x: this._element.offsetWidth >> 1, y: 0 },
      bottom: {
        x: this._element.offsetWidth >> 1,
        y: this._element.offsetHeight
      },
      right: {
        x: this._element.offsetWidth,
        y: this._element.offsetHeight >> 1
      },
      left: { x: 0, y: this._element.offsetHeight >> 1 },
      "top-left": { x: 0, y: 0 },
      "top-right": { x: this._element.offsetWidth, y: 0 },
      "bottom-left": { x: 0, y: this._element.offsetHeight },
      "bottom-right": {
        x: this._element.offsetWidth,
        y: this._element.offsetHeight
      }
    };

    return (
      positions[this._options.position] ||
      positions[positionMapping[this._options.position]] ||
      positions["cursor"]
    );
  }

  private caculateRippleSize(x: number, y: number) {
    const offsetLeft = x;
    const offsetTop = y;
    const offsetRight = this._element.offsetWidth - offsetLeft;
    const offsetBottom = this._element.offsetHeight - offsetTop;

    const maxWidth = Math.max(offsetLeft, offsetRight);
    const maxHeight = Math.max(offsetTop, offsetBottom);

    const rippleSize =
      Math.ceil(Math.sqrt(maxWidth ** 2 + maxHeight ** 2)) * 2 * 1.1;
    const customSizeRatio = Math.min(1, Math.max(0, this._options.sizeRatio));
    const customRippleSize = rippleSize * customSizeRatio;

    return Math.min(customRippleSize, Ripple.rippleSizeThreshold);
  }

  private startRippleAnimation(ripple: HTMLElement) {
    setCSS(ripple, {
      scale: "0",
      opacity: "1",
      transitionProperty: "scale, opacity",
      transitionDuration: this._options.duration,
      transitionTimingFunction: this._options.timingFunction,
      willChange: "scale, opacity"
    });
  }

  private endRippleAnimation(ripple: HTMLElement) {
    setCSS(ripple, {
      scale: "1",
      opacity: "0"
    });
  }

  // This method must be an arrow function to bind this.
  private addMouseRippleEffect = (event: MouseEvent) => {
    // Use throttle to limit the time threshold of tipple triggering.
    if (this._timer) return;

    let repeatCount = Math.min(
      Math.max(1, this._options.repeatCount),
      Ripple.rippleRepeatCountThreshold
    );
    this.addRippleEffect(event);
    --repeatCount;
    const interval = setInterval(() => {
      if (repeatCount-- === 0) {
        clearInterval(interval);
        return;
      }
      this.addRippleEffect(event);
    }, parseDuration(this._options.repeatInterval));

    this._timer = setTimeout(() => {
      this._timer = null;
    }, Ripple.rippleTimeThreshold);
  };

  private addRippleEffect(event?: MouseEvent) {
    // Remove the first ripple when the number of ripples exceeds the threshold.
    const maxCount = Math.min(
      Math.max(1, this._options.maxCount),
      Ripple.rippleCountThreshold
    );
    while (this._rippleInstances.length >= maxCount) {
      this._rippleInstances.shift().remove();
    }

    const { x, y } = this.getRipplePosition(event);
    const rippleSize = this._options.size || this.caculateRippleSize(x, y);
    const ripple = this.createRipple(rippleSize, x, y);
    const rippleIndex = this._rippleInstances.length;
    this._rippleInstances.push(ripple);
    this._rippleWrapper.appendChild(ripple);

    this.startRippleAnimation(ripple);

    /**
     * Only use requestAnimationFrame to add ripple animation,
     * because if you use setTimeout and the time interval is too short(e.g., <16ms),
     * the startRippleAnimation and endRippleAnimation may trigger in the same frame,
     * causing the animation not to play.
     */
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.endRippleAnimation(ripple);

        if (
          this._options.mode === "keep" &&
          (this._options.event === "mousedown" ||
            this._options.event === "mouseenter")
        ) {
          const unlockKeepEvent =
            {
              mousedown: "mouseup",
              mouseenter: "mouseleave"
            }[this._options.event] || "mouseleave";

          this._element.addEventListener(
            unlockKeepEvent,
            () => {
              ripple.remove();
              this._rippleInstances.splice(rippleIndex, 1);
            },
            { once: true }
          );

          return;
        }

        setTimeout(
          () => {
            ripple.remove();
            this._rippleInstances.splice(rippleIndex, 1);
          },
          parseDuration(this._options.duration) * 1.1
        );
      }, parseDuration(this._options.delay));
    });
  }
}

export function rippleInit() {
  const elements = document.querySelectorAll<HTMLElement>("[w-ripple]");
  for (const element of elements) {
    const options = {};
    for (const key in defaulRippleOptionss) {
      const attributeName = parseOptionKeyToAttributeName(key);
      const attributeValue = element.getAttribute(attributeName);
      options[key] = attributeValue;
    }
    const ripple = new Ripple(element, options as TRippleOptions);
    ripple.setEffect();
  }
}
