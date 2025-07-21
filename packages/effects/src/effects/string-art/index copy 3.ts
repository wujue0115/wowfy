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
}

function getLinePixels(x0: number, y0: number, x1: number, y1: number): Point[] {
  const pixels: Point[] = []
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    pixels.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x0 += sx
    }
    if (e2 < dx) {
      err += dx
      y0 += sy
    }
  }
  return pixels
}

// function generateGrayscaleImage(imageGrayData: number[][][]) {
//   const height = imageGrayData.length
//   if (height === 0) return
//   const width = imageGrayData[0].length
//   if (width === 0) return

//   const canvas = document.createElement('canvas')
//   canvas.width = width
//   canvas.height = height
//   const ctx = canvas.getContext('2d')
//   if (!ctx) return

//   const imageData = ctx.createImageData(width, height)
//   const data = imageData.data

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const index = (y * width + x) * 4
//       // We are reversing the color from `255 - gray` back to `gray` for correct display
//       const originalGray = 255 - imageGrayData[y][x][0]
//       data[index] = originalGray // R
//       data[index + 1] = originalGray // G
//       data[index + 2] = originalGray // B
//       data[index + 3] = 255 // A
//     }
//   }

//   ctx.putImageData(imageData, 0, 0)
//   console.log('Grayscale PNG Data URL:', canvas.toDataURL('image/png'))
// }

export async function drawStringArt(options: drawStringArtOptions) {
  const { canvas, ctx, dpr, imageGrayData, points, lines, lineColor, lineWidth } = options

  // generateGrayscaleImage(imageGrayData)

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

  // Make a mutable copy of the image data
  const mutableGrayData = imageGrayData.map(row => [...row])
  const imgHeight = mutableGrayData.length
  const imgWidth = mutableGrayData[0].length

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

        if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) currentScore += mutableGrayData[imgY][imgX][0]
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
        // Decrease the brightness of the pixels on the line
        mutableGrayData[imgY][imgX][0] = Math.max(0, mutableGrayData[imgY][imgX][0] - 20)
      }
    }

    currentPinIndex = nextPinIndex

    if (i % 200 === 0) await sleep(100)
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

function getImageData(canvas: HTMLCanvasElement, colorSpace: ColorSpace = 'gray'): number[][][] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
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
      this.stringArtCanvas = this.createCanvas()
      this.stringArtWrapper.appendChild(this.stringArtCanvas)
      this.el.appendChild(this.stringArtWrapper)
      this.ctx = this.stringArtCanvas.getContext('2d')

      if (this.ctx) {
        // 設置 Canvas 渲染優化
        this.ctx.imageSmoothingEnabled = false // 禁用圖像平滑，避免模糊
        this.ctx.scale(this.dpr, this.dpr)
      }
    }
  }

  update(options: StringArtOptions) {
    this.options = options
  }

  async start() {
    const imagePipeline = pipe(
      loadImage,
      res => resizeImage(res, 512),
      res => getImageData(res, 'gray'),
    )
    const imageGrayData = await imagePipeline(this.options.image)

    console.log('Device Pixel Ratio:', this.dpr)
    console.log('Image Gray Width:', imageGrayData[0].length)
    console.log('Image Gray Height:', imageGrayData.length)

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
  }

  destroy() {
    this.stringArtInstances.forEach(r => r.remove())
    this.stringArtInstances = []
    this.stringArtWrapper?.remove()
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
