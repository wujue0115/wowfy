import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { StringArtEffect, StringArtOptions } from '../../types'
import { addStyles, createElement, parseDuration, pipe, sleep, validateCSSTime, validateRange } from '../../utils'

export interface drawStringArtOptions {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
  imageData: number[][][]
  points: number
  lines: number
  lineColor: string
  lineWidth: number
}

export interface Point {
  x: number
  y: number
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
    img.crossOrigin = 'anonymous'

    let objectUrl: string | null = null

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(img)
    }

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    if (typeof image === 'string') {
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

  const ratio = Math.min(
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
  return grayValue
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

export async function drawStringArt(options: drawStringArtOptions) {
  console.log('drawStringArt', options)

  const { canvas, ctx, dpr, imageRgbData, points, lines, lineColor, lineWidth }
    = options

  // **1. 初始設定**
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  ctx.scale(dpr, dpr)
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = lineColor

  // 影像像素數據拷貝
  const imgData = JSON.parse(JSON.stringify(imageRgbData))
  // const imgData = imageDataToGrayScale(imageRgbData)

  // console.log('影像像素數據拷貝')
  // console.log('canvas.width', canvas.width)
  // console.log('canvas.height', canvas.height)

  // **2. 生成圓點**
  const width = canvas.width / dpr
  const height = canvas.height / dpr
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.5
  const nailPositions = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * Math.PI * 2
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })

  nailPositions.forEach((pos) => {
    // console.log('生成圓點', pos)
    drawRect(ctx, pos.x, pos.y, 1, 1, {
      color: '#000',
      fill: true,
    })
  })

  // console.log('生成圓點')

  // **3. 畫線**
  let currentPointIndex = Math.floor(Math.random() * points)
  const usedPairs = new Set<string>() // 記錄已經畫過的線
  // const lineToString = (start: Point, end: Point) => `${start.x.toFixed(2)},${start.y.toFixed(2)}-${end.x.toFixed(2)},${end.y.toFixed(2)}`
  const lineToString = (start: number, end: number) => {
    const key = [start, end].sort((a, b) => a - b).join('-')
    return key
  }

  async function drawNextLine(): Promise<void> {
    let bestNextIndex = -1
    let bestDiff = Infinity
    let bestDiffLinePixels: { x: number, y: number, diffColor: number[] }[] = []
    const currentPoint = nailPositions[currentPointIndex]

    // **3.1 貪婪尋找下一個點**
    for (const [index, target] of nailPositions.entries()) {
      if (index !== currentPointIndex) {
        if (usedPairs.has(lineToString(currentPointIndex, index))) return
        const [diff, updatedLineColor] = computeLineDifference(imgData, currentPoint.x, currentPoint.y, target.x, target.y, [0, 0, 0], ctx)

        drawLine(ctx, currentPoint, target, {
          color: '#000',
          width: 1,
        })
        for (const { x, y, coverage } of updatedLineColor) {
          await sleep(2000)
          console.log('更新影像數據', x, y, `${Math.round(coverage * 100)}%`)
          drawRect(ctx, x, y, 1, 1, {
            color: `#f00`,
            fill: true,
          })
        }
        // console.log('貪婪尋找下一個點', target, index, diff)
        if (diff < bestDiff) {
          bestDiff = diff
          bestNextIndex = index
          bestDiffLinePixels = updatedLineColor
        }
      }
    }

    // nailPositions.forEach(async (target, index) => {
    //   // console.log('貪婪尋找下一個點', target, index)

    // })

    // console.log('貪婪尋找下一個點', `(${currentPointIndex}, ${bestNextIndex})`, bestDiff)

    if (bestNextIndex === -1) {
      return
    }

    const nextPoint = nailPositions[bestNextIndex]

    usedPairs.add(lineToString(currentPointIndex, bestNextIndex))

    // **動畫畫線**
    await new Promise<void>((resolve) => {
      let progress = 0
      let preX = currentPoint.x
      let preY = currentPoint.y

      function animateLine() {
        progress += 0.5
        if (progress > 1) {
          // 畫完後更新影像數據
          // updateImageData(imgData, currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y, [0, 0, 0])
          updateImageData(imgData, bestDiffLinePixels)
          currentPointIndex = bestNextIndex
          resolve()
          return
        }

        const x = currentPoint.x * (1 - progress) + nextPoint.x * progress
        const y = currentPoint.y * (1 - progress) + nextPoint.y * progress

        drawLine(ctx, { x: preX, y: preY }, { x, y }, {
          color: lineColor,
          width: lineWidth,
        })

        preX = x
        preY = y

        requestAnimationFrame(animateLine)
        // setTimeout(animateLine, 1000)
      }
      animateLine()
    })
  }

  for (let i = 0; i < lines; i++) {
    await drawNextLine()
  }
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
      this.ctx?.scale(this.dpr, this.dpr)
    }
  }

  update(options: StringArtOptions) {
    this.options = options
  }

  async start() {
    const imagePipeline = pipe(
      loadImage,
      res => resizeImage(res, 512),
      res => getImageData(res, 'rgb'),
    )
    const imageData = await imagePipeline(this.options.image)

    await drawStringArt({
      canvas: this.stringArtCanvas!,
      ctx: this.ctx!,
      dpr: this.dpr,
      imageData,
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
