import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { StringArtEffect, StringArtOptions } from '../../types'
import { addStyles, createElement, parseDuration, pipe, sleep, validateCSSTime, validateRange } from '../../utils'

export interface drawStringArtOptions {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
  imageGrayData: number[][][]
  points: number
  lines: number
  lineColor: string
  lineWidth: number
}

export interface Point {
  x: number
  y: number
  coverage?: number // 線條在像素內的覆蓋比率 (0-1)
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

export async function drawStringArt(options: drawStringArtOptions) {
  const { canvas, ctx, dpr, imageGrayData, points, lines, lineColor, lineWidth } = options

  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) / 2

  // 1. Generate pins
  const pins: Point[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    pins.push({
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    })
  }

  // Make a deep copy of the image data to avoid modifying the original
  const mutableGrayData = imageGrayData.map(row => row.map(pixel => [...pixel]))
  const imgHeight = mutableGrayData.length
  const imgWidth = mutableGrayData[0].length

  // 根據線條顏色計算扣除強度
  const colorIntensity = parseLineColorIntensity(lineColor) * 0.09

  console.log('Color Intensity:', colorIntensity)

  // 設置線條渲染屬性
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = lineColor
  ctx.lineCap = 'round' // 使線條端點圓滑
  ctx.lineJoin = 'round' // 使線條連接點圓滑

  let currentPinIndex = 0
  let nextPinIndex = 0

  for (let i = 0; i < lines; i++) {
    // console.log('i: ', i)
    let bestScore = -1

    for (let j = 0; j < points; j++) {
      if (j === currentPinIndex) continue

      const linePixels = getLinePixels(pins[currentPinIndex].x, pins[currentPinIndex].y, pins[j].x, pins[j].y)
      let currentScore = 0

      for (const pixel of linePixels) {
        // Map canvas coordinates to image data coordinates
        const imgX = Math.floor((pixel.x / width) * imgWidth)
        const imgY = Math.floor((pixel.y / height) * imgHeight)

        if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
          // 使用覆蓋率加權計算分數
          const coverage = pixel.coverage || 1
          currentScore += mutableGrayData[imgY][imgX][0] * coverage
        }
      }

      if (currentScore > bestScore) {
        bestScore = currentScore
        nextPinIndex = j
      }
    }

    // Draw the best line
    ctx.beginPath()
    // 使用 Math.round 確保座標為整數，避免半像素模糊
    const x1 = Math.round(pins[currentPinIndex].x)
    const y1 = Math.round(pins[currentPinIndex].y)
    const x2 = Math.round(pins[nextPinIndex].x)
    const y2 = Math.round(pins[nextPinIndex].y)

    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = lineColor
    ctx.lineWidth = lineWidth
    ctx.stroke()

    // Update the grayscale data
    const drawnLinePixels = getLinePixels(pins[currentPinIndex].x, pins[currentPinIndex].y, pins[nextPinIndex].x, pins[nextPinIndex].y)
    for (const pixel of drawnLinePixels) {
      const imgX = Math.floor((pixel.x / width) * imgWidth)
      const imgY = Math.floor((pixel.y / height) * imgHeight)

      if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
        // 根據覆蓋率調整顏色強度的影響
        const coverage = pixel.coverage || 1
        const adjustedIntensity = colorIntensity * coverage
        mutableGrayData[imgY][imgX][0] = Math.max(0, mutableGrayData[imgY][imgX][0] - adjustedIntensity)
      }
    }

    currentPinIndex = nextPinIndex

    if (i % 20 === 0) await sleep('frame')
    if (i % 200 === 0) {
      console.log('Drawing progress:', Math.round((i / lines) * 100), '%')
    }
  }
}

export interface drawStringSvgOptions {
  svgElement: SVGElement
  imageGrayData: number[][][]
  points: number
  lines: number
  lineColor: string
  lineWidth: number
  width: number
  height: number
}

export async function drawStringSvg(options: drawStringSvgOptions) {
  const { svgElement, imageGrayData, points, lines, lineColor, lineWidth, width, height } = options

  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) / 2

  // 1. Generate pins
  const pins: Point[] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    pins.push({
      x: Math.round(center.x + radius * Math.cos(angle)),
      y: Math.round(center.y + radius * Math.sin(angle)),
    })
  }

  // Make a deep copy of the image data to avoid modifying the original
  const mutableGrayData = imageGrayData.map(row => row.map(pixel => [...pixel]))
  const imgHeight = mutableGrayData.length
  const imgWidth = mutableGrayData[0].length

  // 根據線條顏色計算扣除強度
  const colorIntensity = parseLineColorIntensity(lineColor) * 0.09

  console.log('Color Intensity:', colorIntensity)

  // Create SVG group for all lines
  const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  linesGroup.setAttribute('stroke', lineColor)
  linesGroup.setAttribute('stroke-width', lineWidth.toString())
  linesGroup.setAttribute('stroke-linecap', 'round')
  linesGroup.setAttribute('stroke-linejoin', 'round')
  linesGroup.setAttribute('fill', 'none')

  svgElement.appendChild(linesGroup)

  let currentPinIndex = 0
  let nextPinIndex = 0

  for (let i = 0; i < lines; i++) {
    let bestScore = -1

    for (let j = 0; j < points; j++) {
      if (j === currentPinIndex) continue

      const linePixels = getLinePixels(pins[currentPinIndex].x, pins[currentPinIndex].y, pins[j].x, pins[j].y)
      let currentScore = 0

      for (const pixel of linePixels) {
        // Map SVG coordinates to image data coordinates
        const imgX = Math.floor((pixel.x / width) * imgWidth)
        const imgY = Math.floor((pixel.y / height) * imgHeight)

        if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
          // 使用覆蓋率加權計算分數
          const coverage = pixel.coverage || 1
          currentScore += mutableGrayData[imgY][imgX][0] * coverage
        }
      }

      if (currentScore > bestScore) {
        bestScore = currentScore
        nextPinIndex = j
      }
    }

    // Draw the best line using SVG
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', pins[currentPinIndex].x.toString())
    line.setAttribute('y1', pins[currentPinIndex].y.toString())
    line.setAttribute('x2', pins[nextPinIndex].x.toString())
    line.setAttribute('y2', pins[nextPinIndex].y.toString())
    linesGroup.appendChild(line)

    // Update the grayscale data
    const drawnLinePixels = getLinePixels(pins[currentPinIndex].x, pins[currentPinIndex].y, pins[nextPinIndex].x, pins[nextPinIndex].y)
    for (const pixel of drawnLinePixels) {
      const imgX = Math.floor((pixel.x / width) * imgWidth)
      const imgY = Math.floor((pixel.y / height) * imgHeight)

      if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
        // 根據覆蓋率調整顏色強度的影響
        const coverage = pixel.coverage || 1
        const adjustedIntensity = colorIntensity * coverage
        mutableGrayData[imgY][imgX][0] = Math.max(0, mutableGrayData[imgY][imgX][0] - adjustedIntensity)
      }
    }

    currentPinIndex = nextPinIndex

    if (i % 20 === 0) await sleep('frame')
    if (i % 200 === 0) {
      console.log('Drawing progress:', Math.round((i / lines) * 100), '%')
    }
  }
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
      await drawStringArt({
        canvas: this.stringArtCanvas!,
        ctx: this.ctx!,
        dpr: this.dpr,
        imageGrayData,
        points: this.options.points,
        lines: this.options.lines,
        lineColor: this.options.lineColor,
        lineWidth: this.options.lineWidth,
      })
    } else {
      await drawStringSvg({
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
