import type { CoreEffect } from '@wowfy/core'

export type WritableCSSStyleDeclaration = {
  -readonly [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K];
}

export type FilteredCSSStyleDeclaration = {
  [K in keyof WritableCSSStyleDeclaration as WritableCSSStyleDeclaration[K] extends string ? K : never]: string
}

export type CSSStyles = Record<Exclude<keyof FilteredCSSStyleDeclaration, number>, string>

type MouseEventMap = {
  [K in keyof GlobalEventHandlersEventMap as GlobalEventHandlersEventMap[K] extends MouseEvent ? K : never]: MouseEvent
}

export type RippleMode = 'keep' | 'unkeep'

export type RipplePosition =
  | 'cursor'
  | 'center'
  | 'random'
  | 'top'
  | 'bottom'
  | 'right'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom'
  | 'cs'
  | 'ct'
  | 'rd'
  | 't'
  | 'r'
  | 'b'
  | 'l'
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'
  | 'lt'
  | 'lb'
  | 'rt'
  | 'rb'

export interface RippleOptions {
  event: keyof MouseEventMap
  background: string
  duration: string
  timingFunction: string
  mode: RippleMode
  position: RipplePosition
  delay: string
  size: number | false
  sizeRatio: number
  repeatCount: number
  repeatInterval: string
  maxCount: number
  outline: string
  boxShadow: string
}

export type RippleEffect = CoreEffect<RippleOptions>

export type LineAlgorithm = 'xiaolin-wu' | 'bresenham'

export type BackgroundSize = 'contain' | 'cover' | 'auto' | string

export type BackgroundPosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right' | string

export type PinShape = 'circle' | 'square' | 'diamond' | 'polygon' | string

export interface StringArtOptions {
  duration: string
  delay: string
  size: number | false
  image: File | Blob | string
  points: number
  lines: number
  lineColor: string
  lineWidth: number
  lineAlgorithm: LineAlgorithm
  backgroundSize: BackgroundSize
  backgroundPosition: BackgroundPosition
  pinShape: PinShape
}

export interface StringArtEffect extends CoreEffect<StringArtOptions> {
  start: () => Promise<void>
}
