import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { StringArtEffect, StringArtOptions } from '../../types'
import { addStyles, createElement, parseDuration, pipe, sleep, validateCSSTime, validateRange } from '../../utils'

export interface Point {
  x: number
  y: number
  coverage?: number // 線條在像素內的覆蓋比率 (0-1)
}

export interface BaseDrawOptions {
  imageGrayData: number[][][]
  points: number
  lines: number
  lineColor: string
  lineWidth: number
  width: number
  height: number
}

export interface CanvasDrawOptions extends BaseDrawOptions {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
}

export interface SvgDrawOptions extends BaseDrawOptions {
  svgElement: SVGElement
}

export interface StringArtRenderer {
  setupRenderer: () => void
  drawLine: (from: Point, to: Point) => void
  getProgress: () => number
}

/**
 * Wu's Line Algorithm - 抗鋸齒線條算法
 * 計算線段經過的所有像素及其覆蓋率
 * @param x0 起點 x 座標
 * @param y0 起點 y 座標
 * @param x1 終點 x 座標
 * @param y1 終點 y 座標
 * @returns 包含像素座標和覆蓋率的點陣列
 */
function getLinePixels(x0: number, y0: number, x1: number, y1: number): Point[] {
  const pixels: Point[] = []

  // 數學輔助函數
  const fpart = (x: number): number => x - Math.floor(x)
  // const rfpart = (x: number): number => 1 - fpart(x)

  // 像素繪製函數
  const plotPixel = (x: number, y: number, coverage: number): void => {
    if (coverage > 0.001) { // 過濾極小的覆蓋率
      pixels.push({
        x: Math.floor(x),
        y: Math.floor(y),
        coverage: Math.min(1, coverage), // 確保覆蓋率不超過 1
      })
    }
  }

  // 判斷線條是否陡峭（斜率絕對值 > 1）
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)

  // 座標變換：如果線條陡峭，交換 x 和 y 座標
  if (steep) {
    let temp = x0
    x0 = y0
    y0 = temp
    temp = x1
    x1 = y1
    y1 = temp
  }

  // 確保線條從左到右繪製
  if (x0 > x1) {
    let temp = x0
    x0 = x1
    x1 = temp
    temp = y0
    y0 = y1
    y1 = temp
  }

  // 計算線條參數
  const dx = x1 - x0
  const dy = y1 - y0
  const gradient = dx === 0 ? 1 : dy / dx

  // === 處理起點 ===
  const startPoint = processEndpoint(x0, y0, gradient, true)
  plotEndpoint(startPoint, steep, plotPixel)

  // === 處理終點 ===
  const endPoint = processEndpoint(x1, y1, gradient, false)
  plotEndpoint(endPoint, steep, plotPixel)

  // === 主循環：繪製中間像素 ===
  let currentY = startPoint.yend + gradient

  for (let x = startPoint.xpixel + 1; x < endPoint.xpixel; x++) {
    const yFloor = Math.floor(currentY)
    const yFraction = fpart(currentY)

    if (steep) {
      plotPixel(yFloor, x, 1 - yFraction)
      plotPixel(yFloor + 1, x, yFraction)
    } else {
      plotPixel(x, yFloor, 1 - yFraction)
      plotPixel(x, yFloor + 1, yFraction)
    }

    currentY += gradient
  }

  return pixels
}

// 數學輔助函數（在函數外部定義以便重用）
const fpart = (x: number): number => x - Math.floor(x)
const rfpart = (x: number): number => 1 - fpart(x)

/**
 * 處理線條端點
 */
function processEndpoint(x: number, y: number, gradient: number, isStart: boolean) {
  const xend = Math.round(x)
  const yend = y + gradient * (xend - x)
  const xgap = isStart ? rfpart(x + 0.5) : fpart(x + 0.5)

  return {
    xpixel: xend,
    ypixel: Math.floor(yend),
    yend,
    xgap,
  }
}

/**
 * 繪製端點像素
 */
function plotEndpoint(
  endpoint: { xpixel: number, ypixel: number, yend: number, xgap: number },
  steep: boolean,
  plotPixel: (x: number, y: number, coverage: number) => void,
) {
  const { xpixel, ypixel, yend, xgap } = endpoint
  const yFraction = fpart(yend)

  if (steep) {
    plotPixel(ypixel, xpixel, (1 - yFraction) * xgap)
    plotPixel(ypixel + 1, xpixel, yFraction * xgap)
  } else {
    plotPixel(xpixel, ypixel, (1 - yFraction) * xgap)
    plotPixel(xpixel, ypixel + 1, yFraction * xgap)
  }
}

function parseLineColorIntensity(lineColor: string): number {
  // 将颜色字符串转换为灰阶色彩值
  const colorRegex = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
  const rgbaRegex = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/

  if (colorRegex.test(lineColor)) {
    // 处理十六进制颜色
    const hex = lineColor.slice(1)
    let r: number, g: number, b: number

    if (hex.length === 3) {
      // #RGB 格式
      r = Number.parseInt(hex[0] + hex[0], 16)
      g = Number.parseInt(hex[1] + hex[1], 16)
      b = Number.parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 4) {
      // #RGBA 格式
      r = Number.parseInt(hex[0] + hex[0], 16)
      g = Number.parseInt(hex[1] + hex[1], 16)
      b = Number.parseInt(hex[2] + hex[2], 16)
    } else if (hex.length === 6) {
      // #RRGGBB 格式
      r = Number.parseInt(hex.slice(0, 2), 16)
      g = Number.parseInt(hex.slice(2, 4), 16)
      b = Number.parseInt(hex.slice(4, 6), 16)
    } else if (hex.length === 8) {
      // #RRGGBBAA 格式
      r = Number.parseInt(hex.slice(0, 2), 16)
      g = Number.parseInt(hex.slice(2, 4), 16)
      b = Number.parseInt(hex.slice(4, 6), 16)
    } else {
      return 20 // 默认值
    }

    // 使用加权平均法计算灰度值
    return 255 - Math.round(r * 0.299 + g * 0.587 + b * 0.114)
  } else if (rgbaRegex.test(lineColor)) {
    // 处理 rgba 格式
    const match = lineColor.match(rgbaRegex)
    if (match) {
      const r = Number.parseInt(match[1], 10)
      const g = Number.parseInt(match[2], 10)
      const b = Number.parseInt(match[3], 10)
      // 使用加权平均法计算灰度值
      return 255 - Math.round(r * 0.299 + g * 0.587 + b * 0.114)
    }
  }

  // 默认灰度值
  return 20
}

/**
 * Canvas 渲染器實現
 */
class CanvasRenderer implements StringArtRenderer {
  private ctx: CanvasRenderingContext2D
  private lineColor: string
  private lineWidth: number
  private dpr: number

  constructor(options: CanvasDrawOptions) {
    this.ctx = options.ctx
    this.lineColor = options.lineColor
    this.lineWidth = options.lineWidth
    this.dpr = options.dpr
  }

  setupRenderer(): void {
    this.ctx.lineWidth = this.lineWidth
    this.ctx.strokeStyle = this.lineColor
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }

  drawLine(from: Point, to: Point): void {
    this.ctx.beginPath()
    const x1 = Math.round(from.x)
    const y1 = Math.round(from.y)
    const x2 = Math.round(to.x)
    const y2 = Math.round(to.y)

    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.strokeStyle = this.lineColor
    this.ctx.lineWidth = this.lineWidth
    this.ctx.stroke()
  }

  getProgress(): number {
    return 0 // Canvas 不需要特殊的進度追蹤
  }
}

/**
 * SVG 渲染器實現
 */
class SvgRenderer implements StringArtRenderer {
  private svgElement: SVGElement
  private linesGroup: SVGGElement
  private lineColor: string
  private lineWidth: number

  constructor(options: SvgDrawOptions) {
    this.svgElement = options.svgElement
    this.lineColor = options.lineColor
    this.lineWidth = options.lineWidth
    this.linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  }

  setupRenderer(): void {
    this.linesGroup.setAttribute('stroke', this.lineColor)
    this.linesGroup.setAttribute('stroke-width', this.lineWidth.toString())
    this.linesGroup.setAttribute('stroke-linecap', 'round')
    this.linesGroup.setAttribute('stroke-linejoin', 'round')
    this.linesGroup.setAttribute('fill', 'none')
    this.svgElement.appendChild(this.linesGroup)
  }

  drawLine(from: Point, to: Point): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', from.x.toString())
    line.setAttribute('y1', from.y.toString())
    line.setAttribute('x2', to.x.toString())
    line.setAttribute('y2', to.y.toString())
    this.linesGroup.appendChild(line)
  }

  getProgress(): number {
    return this.linesGroup.children.length
  }
}

/**
 * 生成釘子位置
 */
function generatePins(center: Point, radius: number, points: number): Point[] {
  const pins: Point[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    pins.push({
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    })
  }
  return pins
}

/**
 * 計算線條分數
 */
function calculateLineScore(
  from: Point,
  to: Point,
  grayData: number[][][],
  width: number,
  height: number,
): number {
  const linePixels = getLinePixels(from.x, from.y, to.x, to.y)
  let score = 0
  const imgHeight = grayData.length
  const imgWidth = grayData[0].length

  for (const pixel of linePixels) {
    const imgX = Math.floor((pixel.x / width) * imgWidth)
    const imgY = Math.floor((pixel.y / height) * imgHeight)

    if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
      const coverage = pixel.coverage || 1
      score += grayData[imgY][imgX][0] * coverage
    }
  }

  return score
}

/**
 * 更新灰階數據
 */
function updateGrayData(
  from: Point,
  to: Point,
  grayData: number[][][],
  width: number,
  height: number,
  colorIntensity: number,
): void {
  const linePixels = getLinePixels(from.x, from.y, to.x, to.y)
  const imgHeight = grayData.length
  const imgWidth = grayData[0].length

  for (const pixel of linePixels) {
    const imgX = Math.floor((pixel.x / width) * imgWidth)
    const imgY = Math.floor((pixel.y / height) * imgHeight)

    if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
      const coverage = pixel.coverage || 1
      const adjustedIntensity = colorIntensity * coverage
      grayData[imgY][imgX][0] = Math.max(0, grayData[imgY][imgX][0] - adjustedIntensity)
    }
  }
}

/**
 * 統一的字符串藝術繪製函數
 */
export async function drawStringArt(options: BaseDrawOptions, renderer: StringArtRenderer): Promise<void> {
  const { imageGrayData, points, lines, lineColor, width, height } = options

  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) / 2

  // 生成釘子位置
  const pins = generatePins(center, radius, points)

  // 深拷貝圖像數據
  const mutableGrayData = imageGrayData.map(row => row.map(pixel => [...pixel]))
  const colorIntensity = parseLineColorIntensity(lineColor) * 0.09

  console.log('Color Intensity:', colorIntensity)

  // 設置渲染器
  renderer.setupRenderer()

  let currentPinIndex = 0

  for (let i = 0; i < lines; i++) {
    let bestScore = -1
    let nextPinIndex = 0

    // 尋找最佳下一個釘子
    for (let j = 0; j < points; j++) {
      if (j === currentPinIndex) continue

      const score = calculateLineScore(
        pins[currentPinIndex],
        pins[j],
        mutableGrayData,
        width,
        height,
      )

      if (score > bestScore) {
        bestScore = score
        nextPinIndex = j
      }
    }

    // 繪製最佳線條
    renderer.drawLine(pins[currentPinIndex], pins[nextPinIndex])

    // 更新灰階數據
    updateGrayData(
      pins[currentPinIndex],
      pins[nextPinIndex],
      mutableGrayData,
      width,
      height,
      colorIntensity,
    )

    currentPinIndex = nextPinIndex

    // 性能優化：定期讓出控制權
    if (i % 20 === 0) await sleep('frame')
    if (i % 200 === 0) {
      console.log('Drawing progress:', Math.round((i / lines) * 100), '%')
    }
  }
}

/**
 * Canvas 模式的便捷函數
 */
export async function drawStringArtCanvas(options: CanvasDrawOptions): Promise<void> {
  const width = options.canvas.width / options.dpr
  const height = options.canvas.height / options.dpr

  const baseOptions: BaseDrawOptions = {
    ...options,
    width,
    height,
  }

  const renderer = new CanvasRenderer(options)
  await drawStringArt(baseOptions, renderer)
}

/**
 * SVG 模式的便捷函數
 */
export async function drawStringArtSvg(options: SvgDrawOptions): Promise<void> {
  const baseOptions: BaseDrawOptions = options
  const renderer = new SvgRenderer(options)
  await drawStringArt(baseOptions, renderer)
}

export const defaultStringArtOptions: StringArtOptions = {
  duration: '500ms',
  delay: '0ms',
  size: false,
  image: 'https://fakeimg.pl/100x100/',
  // image: 'https://picsum.photos/300/300',
  points: 200,
  lines: 1e4,
  lineColor: '#0001',
  lineWidth: 1,
  mode: 'canvas',
}

function validateOptions(options: StringArtOptions) {
  interface Validator {
    keys: (keyof StringArtOptions)[]
    validate: (value: any) => boolean
    getMessage: (key: any, value: any) => string
  }
  const getRangeInvalidMessage = (k: string, min: number, max: number) => `"${k}" needs to be greater than ${min} and less than or equal to ${max}.`
  const validators: Validator[] = [
    {
      keys: ['duration', 'delay'],
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
      keys: ['mode'],
      validate: v => ['canvas', 'svg'].includes(v),
      getMessage: (k, v) => `"${v}" is not a valid mode. Mode must be either "canvas" or "svg".`,
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

function resolveOptions(options?: Partial<StringArtOptions>): StringArtOptions {
  const resultOptions = { ...defaultStringArtOptions, ...options }
  const { isValid, message } = validateOptions(resultOptions)
  if (!isValid) throw new Error(message)
  return resultOptions
}

function initManagers(managers: { state: StateInstance, event: EventInstance }) {
  const { state, event } = managers
  const status = ['create', 'mount', 'update', 'start', 'destroy']
  status.forEach((s) => {
    state.add(s)
    state.on(s, () => {
      event.emit(`on${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    })
  })
}

function loadImage(image: string | File | Blob) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    let objectUrl: string | null = null

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
    }

    img.onload = () => {
      cleanup()
      resolve(img)
    }

    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image'))
    }

    if (typeof image === 'string') {
      img.crossOrigin = 'anonymous'
      img.src = image
    } else {
      objectUrl = URL.createObjectURL(image)
      img.src = objectUrl
    }
  })
}

function resizeImage(img: HTMLImageElement, maxSize: number = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const ratio = Math.max(
    maxSize / img.width,
    maxSize / img.height,
  )
  const newWidth = img.width * ratio
  const newHeight = img.height * ratio

  canvas.width = newWidth
  canvas.height = newHeight

  ctx?.drawImage(img, 0, 0, newWidth, newHeight)

  return canvas
}

type ColorSpace = 'rgb' | 'rgba' | 'gray'

function covertToGrayScale(rgb: number[]): number {
  const [r, g, b] = rgb
  // 使用加權平均法計算灰度值
  const grayValue = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
  return 255 - grayValue
}

function getImageData(canvas: HTMLCanvasElement, colorSpace: ColorSpace = 'gray', size?: number): number[][][] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  let startX = 0
  let startY = 0
  let targetWidth = canvas.width
  let targetHeight = canvas.height

  // 如果指定了 size，則從中間截取 size x size 的正方形區域
  if (size) {
    targetWidth = Math.min(size, canvas.width)
    targetHeight = Math.min(size, canvas.height)

    // 計算起始位置，確保從中間截取
    startX = Math.floor((canvas.width - targetWidth) / 2)
    startY = Math.floor((canvas.height - targetHeight) / 2)
  }

  const imageData = ctx.getImageData(startX, startY, targetWidth, targetHeight)
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  const result: number[][][] = Array.from({ length: height }, () => Array.from({ length: width }, () => []))
  let index = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (colorSpace === 'gray') {
        const grayValue = covertToGrayScale([data[index], data[index + 1], data[index + 2]])
        result[y][x] = [grayValue]
      } else if (colorSpace === 'rgb') {
        result[y][x] = [data[index], data[index + 1], data[index + 2]]
      } else if (colorSpace === 'rgba') {
        result[y][x] = [data[index], data[index + 1], data[index + 2], data[index + 3]]
      }
      index += 4 // 每個像素有4個值 (R, G, B, A)
    }
  }

  return result
}

class StringArt {
  // This property is used to limit the size of the stringArt.
  static readonly stringArtSizeThreshold = 2000
  // This property is used to limit the time threshold of stringArt triggering.
  static readonly stringArtTimeThreshold = 50

  private el: HTMLElement
  private options: StringArtOptions
  private stringArtWrapper?: HTMLElement
  private stringArtCanvas?: HTMLCanvasElement
  private stringArtSvg?: SVGElement
  private stringArtInstances: HTMLElement[] = []
  private dpr: number = window.devicePixelRatio || 1
  private ctx: CanvasRenderingContext2D | null = null

  constructor(el: HTMLElement, context: CoreContext<StringArtOptions>) {
    this.el = el
    this.options = context.options!
  }

  mount() {
    addStyles(this.el, {
      position: this.el.style.position || 'relative',
    })

    if (!this.stringArtWrapper) {
      this.stringArtWrapper = this.createWrapper()

      if (this.options.mode === 'canvas') {
        this.stringArtCanvas = this.createCanvas()
        this.stringArtWrapper.appendChild(this.stringArtCanvas)
        this.ctx = this.stringArtCanvas.getContext('2d')

        if (this.ctx) {
          // 設置 Canvas 渲染優化
          this.ctx.imageSmoothingEnabled = false // 禁用圖像平滑，避免模糊
          this.ctx.scale(this.dpr, this.dpr)
        }
      } else {
        this.stringArtSvg = this.createSvg()
        this.stringArtWrapper.appendChild(this.stringArtSvg)
      }

      this.el.appendChild(this.stringArtWrapper)
    }
  }

  update(options: StringArtOptions) {
    this.options = options
  }

  async start() {
    const imagePipeline = pipe(
      loadImage,
      res => resizeImage(res, 512),
      res => getImageData(res, 'gray', 512),
    )
    const imageGrayData = await imagePipeline(this.options.image)

    console.log('Device Pixel Ratio:', this.dpr)
    console.log('Image Gray Width:', imageGrayData[0].length)
    console.log('Image Gray Height:', imageGrayData.length)

    if (this.options.mode === 'canvas') {
      await drawStringArtCanvas({
        canvas: this.stringArtCanvas!,
        ctx: this.ctx!,
        dpr: this.dpr,
        imageGrayData,
        points: this.options.points,
        lines: this.options.lines,
        lineColor: this.options.lineColor,
        lineWidth: this.options.lineWidth,
        width: this.el.clientWidth,
        height: this.el.clientHeight,
      })
    } else {
      await drawStringArtSvg({
        svgElement: this.stringArtSvg!,
        imageGrayData,
        points: this.options.points,
        lines: this.options.lines,
        lineColor: this.options.lineColor,
        lineWidth: this.options.lineWidth,
        width: this.el.clientWidth,
        height: this.el.clientHeight,
      })
    }
  }

  destroy() {
    this.stringArtInstances.forEach(r => r.remove())
    this.stringArtInstances = []
    this.stringArtWrapper?.remove()
    this.stringArtCanvas = undefined
    this.stringArtSvg = undefined
    this.ctx = null
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

  private createCanvas() {
    const width = this.el.clientWidth * this.dpr
    const height = this.el.clientHeight * this.dpr

    const canvas = createElement('canvas', {
      position: 'absolute',
      borderRadius: 'inherit',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      contain: 'strict',
    }) as HTMLCanvasElement

    canvas.width = width
    canvas.height = height

    return canvas
  }

  private createSvg() {
    const width = this.el.clientWidth
    const height = this.el.clientHeight

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.style.position = 'absolute'
    svg.style.borderRadius = 'inherit'
    svg.style.pointerEvents = 'none'
    svg.style.contain = 'strict'

    return svg
  }
}

export function createStringArtController(context: CoreContext<Partial<StringArtOptions>>): StringArtEffect {
  const stringArtCollection: StringArt[] = Array.from({ length: context.els.length })

  return {
    create() {
      context.options = resolveOptions(context.options)
      initManagers({ state: context.state, event: context.event })
      context.els.forEach((el, i) => stringArtCollection[i] = new StringArt(el, context as CoreContext<StringArtOptions>))
      context.state.set('create')
    },
    mount() {
      stringArtCollection.forEach((r) => {
        r.mount()
      })
      context.state.set('mount')
    },
    update(options) {
      context.options = resolveOptions({ ...context.options, ...options })
      stringArtCollection.forEach((r) => {
        r.update(context.options as StringArtOptions)
      })
      context.state.set('update')
    },
    async start() {
      await Promise.all(stringArtCollection.map(async (r) => {
        await r.start()
      }))
      context.state.set('start')
    },
    destroy() {
      stringArtCollection.forEach((r) => {
        r.destroy()
      })
      context.state.set('destroy')
      context.state.set(['create', 'mount'], false)
    },
  }
}
