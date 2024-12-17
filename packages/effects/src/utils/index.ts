import type { AnyFunction } from '@wowfy/core'
import type { CSSStyles } from '../types'

export function parseDuration(duration: string) {
  const time = Number.parseFloat(duration.split('m')[0].split('s')[0])
  const millisecond = time * (duration.includes('m') ? 1 : 1000)
  return millisecond
}

export function addStyles(
  element: HTMLElement,
  styles: Partial<CSSStyles>,
) {
  for (const [property, value] of Object.entries(styles)) {
    if (property in element.style) {
      element.style[property as keyof CSSStyles] = value
    }
  }
}

export function createElement(
  tag: keyof HTMLElementTagNameMap = 'div',
  styles?: Partial<CSSStyles>,
): HTMLElement {
  const element = document.createElement(tag)
  styles && addStyles(element, styles)
  return element
}

export function throttle(handler: AnyFunction, delay: number) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (...args: any[]) => {
    if (timer) return

    timer = setTimeout(() => {
      handler(...args)
      timer = null
    }, delay)
  }
}

export function sleep(ms: number) {
  if (setTimeout) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  return new Promise<void>((resolve) => {
    const start = Date.now()
    const end = start + ms
    while (Date.now() < end);
    resolve()
  })
}

export function sleepFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve))
}

export function validateCSSTime(value: string): boolean {
  const regex = /^(?:\d+(?:\.\d+)?|\.?\d+)(?:ms|s)$/
  return regex.test(value)
}

export function validateRange(value: number, { min, max }: { min?: number, max?: number }): boolean {
  return value >= (min ?? -Infinity) && value <= (max ?? Infinity)
}
