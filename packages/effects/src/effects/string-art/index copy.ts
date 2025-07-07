import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { StringArtEffect, StringArtOptions } from '../../types'
import { addStyles, createElement, parseDuration, sleep, validateCSSTime, validateRange } from '../../utils'

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

function resolveImageRgb(image: string | File | Blob): Promise<number[][][]> {
  return new Promise((resolve, reject) => {
    const url = typeof image === 'string' ? image : URL.createObjectURL(image)
    const img = new Image()
    img.crossOrigin = 'anonymous' // This is required to get image data from a different origin
    img.src = url

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const rgbData: number[][][] = Array(canvas.height)

      for (let y = 0; y < canvas.height; y++) {
        const row: number[][] = Array(canvas.width)
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4
          const r = data[index]
          const g = data[index + 1]
          const b = data[index + 2]
          row[x] = [r, g, b]
        }
        rgbData[y] = row
      }

      resolve(rgbData)
    }

    img.onerror = (error) => {
      reject(error)
    }
  })
}

export interface drawStringArtOptions {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
  imageRgbData: number[][][]
  points: number
  lines: number
  lineColor: string
  lineWidth: number
}

export interface Point {
  x: number
  y: number
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  options: { color: string, width: number },
) {
  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.lineWidth = options.width
  ctx.strokeStyle = options.color
  ctx.stroke()
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { color: string, width?: number, fill?: boolean },
) {
  ctx.beginPath()
  ctx.rect(x, y, width, height)
  if (options.fill) {
    ctx.fillStyle = options.color
    ctx.fill()
  }
  if (options.width) {
    ctx.lineWidth = options.width
    ctx.strokeStyle = options.color
    ctx.stroke()
  }
}

// 计算两种颜色之间的 L2 距离
// function colorDifference(c1: number[], c2: number[]): number {
//   return (
//     (c1[0] - c2[0]) ** 2
//     + (c1[1] - c2[1]) ** 2
//     + (c1[2] - c2[2]) ** 2
//   )
// }

// 计算两点之间所有像素的颜色差异总和
// function computeLineDifference(
//   imgData: number[][],
//   x1: number,
//   y1: number,
//   x2: number,
//   y2: number,
//   lineColor: number[],
// ): number {
//   let totalDiff = 0
//   const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))

//   for (let i = 0; i <= steps; i++) {
//     const t = i / steps
//     const x = Math.round(x1 * (1 - t) + x2 * t)
//     const y = Math.round(y1 * (1 - t) + y2 * t)
//     if (x >= 0 && x < imgData.length && y >= 0 && y < imgData[0].length) {
//       totalDiff += colorDifference(imgData[y][x], lineColor)
//     }
//   }
//   return totalDiff
// }

// function computeLineDifference(
//   imgData: number[][][], // 原始三維圖像資料
//   x1: number,
//   y1: number,
//   x2: number,
//   y2: number,
//   lineColor: [number, number, number],
// ): number {
//   const height = imgData.length
//   const width = imgData[0].length
//   const flatLength = width * height * 3

//   // 將 3D 圖像轉換成 1D 陣列
//   const flatOriginal = Array(flatLength)
//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const idx = (y * width + x) * 3
//       const [r, g, b] = imgData[y][x]
//       flatOriginal[idx] = r
//       flatOriginal[idx + 1] = g
//       flatOriginal[idx + 2] = b
//     }
//   }

//   // 複製一份模擬線條用
//   const flatSimulated = flatOriginal.slice()

//   const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
//   for (let i = 0; i <= steps; i++) {
//     const t = i / steps
//     const x = Math.round(x1 * (1 - t) + x2 * t)
//     const y = Math.round(y1 * (1 - t) + y2 * t)

//     if (x < 0 || x >= width || y < 0 || y >= height) continue

//     const idx = (y * width + x) * 3
//     flatSimulated[idx] = lineColor[0]
//     flatSimulated[idx + 1] = lineColor[1]
//     flatSimulated[idx + 2] = lineColor[2]
//   }

//   // 差異總和計算（L1 norm）
//   let totalDiff = 0
//   for (let i = 0; i < flatLength; i++) {
//     totalDiff += Math.abs(flatOriginal[i] - flatSimulated[i])
//   }

//   return totalDiff
// }

function swap<T>(a: T, b: T): [T, T] {
  return [b, a]
}

// function computeLineDifference(
//   imageData: number[][][],
//   x0: number,
//   y0: number,
//   x1: number,
//   y1: number,
//   lineColor: number[],
//   maxDiff?: number,
// ): number {
//   const height = imageData.length
//   const width = imageData[0].length
//   const [lr, lg, lb, la = 255] = lineColor
//   let totalDiff = 0

//   function fpart(x: number) {
//     return x - (x | 0)
//   }

//   function rfpart(x: number) {
//     return 1 - fpart(x)
//   }

//   const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
//   if (steep) {
//     [x0, y0] = swap(x0, y0);
//     [x1, y1] = swap(x1, y1)
//   }

//   if (x0 > x1) {
//     [x0, x1] = swap(x0, x1);
//     [y0, y1] = swap(y0, y1)
//   }

//   const dx = x1 - x0
//   const dy = y1 - y0
//   const gradient = dx === 0 ? 1 : dy / dx

//   const safePlot = (x: number, y: number, coverage: number): boolean => {
//     if (x >= 0 && x < width && y >= 0 && y < height) {
//       const [r, g, b, a = 255] = imageData[y][x]
//       const dr = r - lr
//       const dg = g - lg
//       const db = b - lb
//       const da = a - la
//       const diff = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
//       const scaled = diff * coverage
//       totalDiff += scaled
//       // console.log('totalDiff', totalDiff, 'scaled', scaled, 'diff', diff, 'coverage', coverage)
//       if (maxDiff !== undefined && totalDiff >= maxDiff) return true
//     }
//     return false
//   }

//   // 起點
//   let xEnd = Math.round(x0)
//   let yEnd = y0 + gradient * (xEnd - x0)
//   let xGap = rfpart(x0 + 0.5)
//   const xPixel1 = xEnd
//   const yPixel1 = Math.floor(yEnd)

//   if (steep) {
//     if (safePlot(yPixel1, xPixel1, rfpart(yEnd) * xGap)) return totalDiff
//     if (safePlot(yPixel1 + 1, xPixel1, fpart(yEnd) * xGap)) return totalDiff
//   } else {
//     if (safePlot(xPixel1, yPixel1, rfpart(yEnd) * xGap)) return totalDiff
//     if (safePlot(xPixel1, yPixel1 + 1, fpart(yEnd) * xGap)) return totalDiff
//   }

//   let intery = yEnd + gradient

//   // 終點
//   xEnd = Math.round(x1)
//   yEnd = y1 + gradient * (xEnd - x1)
//   xGap = fpart(x1 + 0.5)
//   const xPixel2 = xEnd
//   const yPixel2 = Math.floor(yEnd)

//   if (steep) {
//     if (safePlot(yPixel2, xPixel2, rfpart(yEnd) * xGap)) return totalDiff
//     if (safePlot(yPixel2 + 1, xPixel2, fpart(yEnd) * xGap)) return totalDiff
//   } else {
//     if (safePlot(xPixel2, yPixel2, rfpart(yEnd) * xGap)) return totalDiff
//     if (safePlot(xPixel2, yPixel2 + 1, fpart(yEnd) * xGap)) return totalDiff
//   }

//   // 中間線段部分
//   if (steep) {
//     for (let x = xPixel1 + 1; x < xPixel2; x++) {
//       const y = Math.floor(intery)
//       if (safePlot(y, x, rfpart(intery))) return totalDiff
//       if (safePlot(y + 1, x, fpart(intery))) return totalDiff
//       intery += gradient
//     }
//   } else {
//     for (let x = xPixel1 + 1; x < xPixel2; x++) {
//       const y = Math.floor(intery)
//       if (safePlot(x, y, rfpart(intery))) return totalDiff
//       if (safePlot(x, y + 1, fpart(intery))) return totalDiff
//       intery += gradient
//     }
//   }

//   return totalDiff
// }

function computeLineDifference(
  imageData: number[][][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  lineColor: number[],
  ctx: CanvasRenderingContext2D,
  maxDiff?: number,
): [number, { x: number, y: number, diffColor: number[], coverage: number }[]] {
  const height = imageData.length
  const width = imageData[0].length
  const [lr, lg, lb, la = 255] = lineColor
  let totalDiff = 0
  const linePixels: { x: number, y: number, diffColor: number[], coverage: number }[] = [] // 儲存每個像素資訊

  function fpart(x: number) {
    return x - (x | 0)
  }

  function rfpart(x: number) {
    return 1 - fpart(x)
  }

  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0)
  if (steep) {
    [x0, y0] = swap(x0, y0);
    [x1, y1] = swap(x1, y1)
  }

  if (x0 > x1) {
    [x0, x1] = swap(x0, x1);
    [y0, y1] = swap(y0, y1)
  }

  const dx = x1 - x0
  const dy = y1 - y0
  const gradient = dx === 0 ? 1 : dy / dx

  const safePlot = (x: number, y: number, coverage: number): boolean => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const [r, g, b, a = 255] = imageData[y][x]
      const dr = r - lr
      const dg = g - lg
      const db = b - lb
      const da = a - la
      const diffColor = [dr, dg, db] // 顏色差異

      const diff = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
      const scaled = diff * coverage
      totalDiff += scaled

      // 儲存每個像素的資訊
      linePixels.push({ x, y, diffColor, coverage })

      if (maxDiff !== undefined && totalDiff >= maxDiff) return true
    }
    return false
  }

  // 起點
  let xEnd = Math.round(x0)
  let yEnd = y0 + gradient * (xEnd - x0)
  let xGap = rfpart(x0 + 0.5)
  const xPixel1 = xEnd
  const yPixel1 = Math.floor(yEnd)

  if (steep) {
    if (safePlot(yPixel1, xPixel1, rfpart(yEnd) * xGap)) return [totalDiff, linePixels]
    if (safePlot(yPixel1 + 1, xPixel1, fpart(yEnd) * xGap)) return [totalDiff, linePixels]
  } else {
    if (safePlot(xPixel1, yPixel1, rfpart(yEnd) * xGap)) return [totalDiff, linePixels]
    if (safePlot(xPixel1, yPixel1 + 1, fpart(yEnd) * xGap)) return [totalDiff, linePixels]
  }

  let intery = yEnd + gradient

  // 終點
  xEnd = Math.round(x1)
  yEnd = y1 + gradient * (xEnd - x1)
  xGap = fpart(x1 + 0.5)
  const xPixel2 = xEnd
  const yPixel2 = Math.floor(yEnd)

  if (steep) {
    if (safePlot(yPixel2, xPixel2, rfpart(yEnd) * xGap)) return [totalDiff, linePixels]
    if (safePlot(yPixel2 + 1, xPixel2, fpart(yEnd) * xGap)) return [totalDiff, linePixels]
  } else {
    if (safePlot(xPixel2, yPixel2, rfpart(yEnd) * xGap)) return [totalDiff, linePixels]
    if (safePlot(xPixel2, yPixel2 + 1, fpart(yEnd) * xGap)) return [totalDiff, linePixels]
  }

  // 中間線段部分
  if (steep) {
    for (let x = xPixel1 + 1; x < xPixel2; x++) {
      const y = Math.floor(intery)
      if (safePlot(y, x, rfpart(intery))) return [totalDiff, linePixels]
      if (safePlot(y + 1, x, fpart(intery))) return [totalDiff, linePixels]
      intery += gradient
    }
  } else {
    for (let x = xPixel1 + 1; x < xPixel2; x++) {
      const y = Math.floor(intery)
      if (safePlot(x, y, rfpart(intery))) return [totalDiff, linePixels]
      if (safePlot(x, y + 1, fpart(intery))) return [totalDiff, linePixels]
      intery += gradient
    }
  }

  return [totalDiff, linePixels]
}

// 更新影像像素色彩，把畫線的色彩加上去
// function updateImageData(
//   imgData: number[][][],
//   x1: number,
//   y1: number,
//   x2: number,
//   y2: number,
//   lineColor: number[],
//   blendFactor = 0.8,
// ) {
//   const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))

//   for (let i = 0; i <= steps; i++) {
//     const t = i / steps
//     const x = Math.round(x1 * (1 - t) + x2 * t)
//     const y = Math.round(y1 * (1 - t) + y2 * t)

//     if (x >= 0 && x < imgData.length && y >= 0 && y < imgData[0].length) {
//       imgData[y][x] = imgData[y][x].map((c, idx) =>
//         Math.round(c * (1 - blendFactor) + lineColor[idx] * blendFactor),
//       )
//     }
//   }
// }

function updateImageData(
  imageData: number[][][],
  linePixels: { x: number, y: number, diffColor: number[] }[],
) {
  for (const { x, y, diffColor } of linePixels) {
    if (x >= 0 && x < imageData[0].length && y >= 0 && y < imageData.length) {
      const [r, g, b] = imageData[y][x]

      // 计算最终颜色：图像颜色减去线条颜色差异并根据覆盖比例调整
      const newR = Math.round(r - diffColor[0])
      const newG = Math.round(g - diffColor[1])
      const newB = Math.round(b - diffColor[2])

      // 更新图像数据
      imageData[y][x] = [newR, newG, newB]
    }
  }
}

// function toGrayScale(color: number[]) {
//   const [r, g, b] = color
//   return 0.299 * r + 0.587 * g + 0.114 * b
// }

// function imageDataToGrayScale(imageData: number[][][]) {
//   const grayData = imageData.map(row => row.map(color => toGrayScale(color)))
//   return grayData
// }

// **主函數**
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
    const imageRgbData = await resolveImageRgb(this.options.image)

    await drawStringArt({
      canvas: this.stringArtCanvas!,
      ctx: this.ctx!,
      dpr: this.dpr,
      imageRgbData,
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
