import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { RippleEffect, RippleOptions, RipplePosition } from '../../types'
import { addStyles, createElement, parseDuration, sleep, sleepFrame, throttle, validateCSSTime, validateRange } from '../../utils'

export const defaultRippleOptions: RippleOptions = {
  event: 'mousedown',
  background: '#ff99ccaa',
  duration: '500ms',
  timingFunction: 'ease-in',
  mode: 'unkeep',
  position: 'cs',
  delay: '0ms',
  size: false,
  sizeRatio: 1,
  repeatCount: 1,
  repeatInterval: '0ms',
  maxCount: 10,
  outline: '',
  boxShadow: '',
}

function validateOptions(options: RippleOptions) {
  interface Validator {
    keys: (keyof RippleOptions)[]
    validate: (value: any) => boolean
    getMessage: (key: any, value: any) => string
  }
  const getRangeInvalidMessage = (k: string, min: number, max: number) => `"${k}" needs to be greater than ${min} and less than or equal to ${max}.`
  const validators: Validator[] = [
    {
      keys: ['duration', 'delay', 'repeatInterval'],
      validate: validateCSSTime,
      getMessage: (k, v) => `"${v}" is an invalid time format in the '${k}' option.`,
    },
    {
      keys: ['duration'],
      validate: v => validateRange(parseDuration(v), { min: 0 }),
      getMessage: k => `"${k}" needs to be greater than 0s.`,
    },
    {
      keys: ['size'],
      validate: v => v ? validateRange(v, { min: 1, max: 2000 }) : true,
      getMessage: k => getRangeInvalidMessage(k, 1, 2000),
    },
    {
      keys: ['sizeRatio'],
      validate: v => validateRange(v, { min: 0, max: 1 }),
      getMessage: k => getRangeInvalidMessage(k, 0, 1),
    },
    {
      keys: ['maxCount'],
      validate: v => validateRange(v, { min: 1, max: 20 }),
      getMessage: k => getRangeInvalidMessage(k, 1, 20),
    },
    {
      keys: ['repeatCount'],
      validate: v => validateRange(v, { min: 1, max: 4 }),
      getMessage: k => getRangeInvalidMessage(k, 1, 4),
    },
  ]

  for (const { keys, validate, getMessage } of validators) {
    for (const key of keys) {
      if (!validate(options[key])) {
        return { isValid: false, message: getMessage(key, options[key]) }
      }
    }
  }

  return { isValid: true }
}

function resolveOptions(options?: Partial<RippleOptions>): RippleOptions {
  const resultOptions = { ...defaultRippleOptions, ...options }
  const { isValid, message } = validateOptions(resultOptions)
  if (!isValid) throw new Error(message)
  return resultOptions
}

function initManagers(managers: { state: StateInstance, event: EventInstance }) {
  const { state, event } = managers
  const status = ['create', 'mount', 'destroy']
  status.forEach((s) => {
    state.add(s)
    state.on(s, () => {
      event.emit(`on${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    })
  })
}

class Ripple {
  // This property is used to limit the size of the ripple.
  static readonly rippleSizeThreshold = 2000
  // This property is used to limit the time threshold of ripple triggering.
  static readonly rippleTimeThreshold = 50

  private el: HTMLElement
  private options: RippleOptions
  private rippleWrapper?: HTMLElement
  private rippleInstances: HTMLElement[] = []
  private isListening = false
  private isRemoveRipple = false

  constructor(el: HTMLElement, context: CoreContext<RippleOptions>) {
    this.el = el
    this.options = context.options!
  }

  mount() {
    if (!this.rippleWrapper) {
      this.rippleWrapper = this.createWrapper()
      this.el.appendChild(this.rippleWrapper)
    }

    addStyles(this.el, {
      position: this.el.style.position || 'relative',
    })

    this.mountListener()
  }

  update(options: RippleOptions) {
    this.options = options
    this.mountListener()
  }

  destroy() {
    this.rippleInstances.forEach(r => r.remove())
    this.rippleInstances = []
    this.rippleWrapper?.remove()
    this.isListening && this.el.removeEventListener(
      this.options.event,
      this.triggerEffect,
    )
    this.isListening = false
  }

  private mountListener() {
    this.isListening && this.el.removeEventListener(
      this.options.event,
      this.triggerEffect,
    )

    this.el.addEventListener(
      this.options.event,
      this.triggerEffect,
    )
    this.isListening = true
  }

  private triggerEffect = throttle((event: MouseEvent) => {
    if (this.isRemoveRipple) return

    let repeatCount = this.options.repeatCount
    this.addRippleEffect(event)

    if (repeatCount === 0) return

    const interval = setInterval(() => {
      if (--repeatCount === 0) {
        clearInterval(interval)
        return
      }

      this.addRippleEffect(event)
    }, parseDuration(this.options.repeatInterval))
  }, Ripple.rippleTimeThreshold)

  private async addRippleEffect(event: MouseEvent) {
    const checkRippleCount = () => {
      // Remove the first ripple when the number of ripples exceeds the threshold.
      if (this.rippleInstances.length < this.options.maxCount) return

      let removeCount = this.options.maxCount - this.rippleInstances.length + 1
      this.rippleInstances = this.rippleInstances.filter((r) => {
        if (removeCount-- <= 0) return true
        r.remove()
        return false
      })
    }

    const startRipple = () => {
      const { x, y } = this.getRipplePosition(event)
      const rippleSize = this.options.size || this.caculateRippleSize(x, y)
      const ripple = this.createRipple(rippleSize, x, y)
      const rippleIndex = this.rippleInstances.length
      this.rippleInstances.push(ripple)
      this.rippleWrapper!.appendChild(ripple)
      this.startRippleAnimation(ripple)

      return { ripple, rippleIndex }
    }

    const endRipple = async (ripple: HTMLElement, rippleIndex: number) => {
      this.endRippleAnimation(ripple)

      const removeRipple = () => {
        const isRemoved = !ripple.parentElement
        if (isRemoved) return
        ripple.remove()
        this.rippleInstances.splice(rippleIndex, 1)
      }

      if (
        this.options.mode === 'keep'
        && (this.options.event === 'mousedown' || this.options.event === 'mouseenter')
      ) {
        const unlockKeepEvent = {
          mousedown: 'mouseup',
          mouseenter: 'mouseleave',
        }[this.options.event] || 'mouseleave'

        this.el.addEventListener(unlockKeepEvent, removeRipple, { once: true })

        return
      }

      await sleep(parseDuration(this.options.duration))
      removeRipple()
    }

    this.isRemoveRipple = true
    checkRippleCount()
    const { ripple, rippleIndex } = startRipple()
    /**
     * Only use requestAnimationFrame to add ripple animation,
     * because if you use setTimeout and the time interval is too short(e.g., <16ms),
     * the startRippleAnimation and endRippleAnimation may trigger in the same frame,
     * causing the animation not to play.
     */
    await sleepFrame()
    this.isRemoveRipple = false
    await sleep(parseDuration(this.options.delay))
    endRipple(ripple, rippleIndex)
  }

  private createWrapper() {
    return createElement('div', {
      position: 'absolute',
      inset: '0',
      borderRadius: 'inherit',
      pointerEvents: 'none',
      contain: 'strict',
    })
  }

  private createRipple(rippleSize: number, x: number, y: number) {
    return createElement('div', {
      width: `${rippleSize}px`,
      aspectRatio: '1',
      position: 'absolute',
      left: '0',
      top: '0',
      translate: `${x - (rippleSize >> 1)}px ${y - (rippleSize >> 1)}px`,
      // There is another way to set the ripple position, but we need to assess its performance compared to the method mentioned above.
      // left: `${x - (rippleSize >> 1)}px`,
      // top: `${y - (rippleSize >> 1)}px`,
      borderRadius: '50%',
      background: this.options.background,
      outline: this.options.outline,
      boxShadow: this.options.boxShadow,
    })
  }

  private startRippleAnimation(ripple: HTMLElement) {
    addStyles(ripple, {
      scale: '0',
      opacity: '1',
      transitionProperty: 'scale, opacity',
      transitionDuration: this.options.duration,
      transitionTimingFunction: this.options.timingFunction,
      willChange: 'scale, opacity',
    })
  }

  private endRippleAnimation(ripple: HTMLElement) {
    addStyles(ripple, {
      scale: '1',
      opacity: '0',
    })
  }

  private getRipplePosition(event: MouseEvent) {
    const positions: Partial<Record<RipplePosition, any>> = {
      'cursor': () => this.getRippleMousePosition(event),
      'center': () => ({
        x: this.el.offsetWidth >> 1,
        y: this.el.offsetHeight >> 1,
      }),
      'random': () => ({
        x: Math.random() * this.el.offsetWidth,
        y: Math.random() * this.el.offsetHeight,
      }),
      'top': () => ({ x: this.el.offsetWidth >> 1, y: 0 }),
      'bottom': () => ({
        x: this.el.offsetWidth >> 1,
        y: this.el.offsetHeight,
      }),
      'right': () => ({
        x: this.el.offsetWidth,
        y: this.el.offsetHeight >> 1,
      }),
      'left': () => ({ x: 0, y: this.el.offsetHeight >> 1 }),
      'top-left': () => ({ x: 0, y: 0 }),
      'top-right': () => ({ x: this.el.offsetWidth, y: 0 }),
      'bottom-left': () => ({ x: 0, y: this.el.offsetHeight }),
      'bottom-right': () => ({
        x: this.el.offsetWidth,
        y: this.el.offsetHeight,
      }),
    }
    const positionMapping: Partial<Record<RipplePosition, keyof typeof positions>> = {
      'left-top': 'top-left',
      'left-bottom': 'bottom-left',
      'right-top': 'top-right',
      'right-bottom': 'bottom-right',
      'cs': 'cursor',
      'ct': 'center',
      'rd': 'random',
      't': 'top',
      'b': 'bottom',
      'l': 'left',
      'r': 'right',
      'tl': 'top-left',
      'tr': 'top-right',
      'bl': 'bottom-left',
      'br': 'bottom-right',
      'lt': 'top-left',
      'lb': 'bottom-left',
      'rt': 'top-right',
      'rb': 'bottom-right',
    }

    return (
      positions[this.options.position]
      || positions[positionMapping[this.options.position] || 'cursor']
    )()
  }

  private getRippleMousePosition(event: MouseEvent) {
    let targetElement = event.target as HTMLElement
    let offsetTop = 0
    let offsetLeft = 0

    while (targetElement !== this.el) {
      offsetTop += targetElement.offsetTop
      offsetLeft += targetElement.offsetLeft
      while (targetElement !== this.el) {
        targetElement = targetElement.parentElement!
        if (
          window
            .getComputedStyle(targetElement)
            .getPropertyValue('position') !== 'static'
        ) {
          break
        }
      }
    }

    return { x: event.offsetX + offsetLeft, y: event.offsetY + offsetTop }
  }

  private caculateRippleSize(x: number, y: number) {
    const offsetLeft = x
    const offsetTop = y
    const offsetRight = this.el.offsetWidth - offsetLeft
    const offsetBottom = this.el.offsetHeight - offsetTop

    const maxWidth = Math.max(offsetLeft, offsetRight)
    const maxHeight = Math.max(offsetTop, offsetBottom)

    const rippleSize
      = Math.ceil(Math.sqrt(maxWidth ** 2 + maxHeight ** 2)) * 2 * 1.1
    const customSizeRatio = Math.min(1, Math.max(0, this.options.sizeRatio))
    const customRippleSize = rippleSize * customSizeRatio

    return Math.min(customRippleSize, Ripple.rippleSizeThreshold)
  }
}

export function createRippleController(context: CoreContext<Partial<RippleOptions>>): RippleEffect {
  const rippleCollection: Ripple[] = Array.from({ length: context.els.length })

  return {
    create() {
      context.options = resolveOptions(context.options)
      initManagers({ state: context.state, event: context.event })
      context.els.forEach((el, i) => rippleCollection[i] = new Ripple(el, context as CoreContext<RippleOptions>))
      context.state.set('create')
    },
    mount() {
      rippleCollection.forEach((r) => {
        r.mount()
      })
      context.state.set('mount')
    },
    update(options) {
      context.options = resolveOptions({ ...context.options, ...options })
      rippleCollection.forEach((r) => {
        r.update(context.options as RippleOptions)
      })
    },
    destroy() {
      rippleCollection.forEach((r) => {
        r.destroy()
      })
      context.state.set('destroy')
      context.state.set(['create', 'mount'], false)
    },
  }
}
