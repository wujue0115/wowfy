import type { CoreContext, EventInstance, StateInstance } from '@wowfy/core'
import type { BackgroundPosition, BackgroundSize, LineAlgorithm, PinShape, StringArtEffect, StringArtOptions } from '../../types'
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
  lineAlgorithm: LineAlgorithm
  backgroundSize: BackgroundSize
  backgroundPosition: BackgroundPosition
  pinShape: PinShape
}

export interface CanvasDrawOptions extends BaseDrawOptions {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
}

export interface StringArtRenderer {
  setupRenderer: () => void
  drawLine: (from: Point, to: Point) => void
  getProgress: () => number
}

// 數學輔助函數（在函數外部定義以便重用）
const fpart = (x: number): number => x - Math.floor(x)
const rfpart = (x: number): number => 1 - fpart(x)

/**
 * Xiaolin Wu's Line Algorithm - 抗鋸齒線條算法
 * 計算線段經過的所有像素及其覆蓋率
 * @param x0 起點 x 座標
 * @param y0 起點 y 座標
 * @param x1 終點 x 座標
 * @param y1 終點 y 座標
 * @returns 包含像素座標和覆蓋率的點陣列
 */
function getLinePixelsXiaolinWu(x0: number, y0: number, x1: number, y1: number): Point[] {
  const pixels: Point[] = []

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

/**
 * Bresenham's Line Algorithm - 經典線條算法
 * 計算線段經過的所有像素，每個像素覆蓋率為 1
 * @param x0 起點 x 座標
 * @param y0 起點 y 座標
 * @param x1 終點 x 座標
 * @param y1 終點 y 座標
 * @returns 包含像素座標的點陣列
 */
function getLinePixelsBresenham(x0: number, y0: number, x1: number, y1: number): Point[] {
  const pixels: Point[] = []

  // 確保座標為整數
  x0 = Math.floor(x0)
  y0 = Math.floor(y0)
  x1 = Math.floor(x1)
  y1 = Math.floor(y1)

  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  let currentX = x0
  let currentY = y0

  while (true) {
    // 添加當前像素
    pixels.push({
      x: currentX,
      y: currentY,
      coverage: 1, // Bresenham 演算法每個像素覆蓋率都是 1
    })

    // 檢查是否到達終點
    if (currentX === x1 && currentY === y1) break

    const e2 = 2 * err

    if (e2 > -dy) {
      err -= dy
      currentX += sx
    }

    if (e2 < dx) {
      err += dx
      currentY += sy
    }
  }

  return pixels
}

/**
 * 根據演算法類型選擇對應的線條像素計算函數
 * @param algorithm 線條演算法類型
 * @param x0 起點 x 座標
 * @param y0 起點 y 座標
 * @param x1 終點 x 座標
 * @param y1 終點 y 座標
 * @returns 包含像素座標和覆蓋率的點陣列
 */
function getLinePixels(algorithm: LineAlgorithm, x0: number, y0: number, x1: number, y1: number): Point[] {
  switch (algorithm) {
    case 'xiaolin-wu':
      return getLinePixelsXiaolinWu(x0, y0, x1, y1)
    case 'bresenham':
      return getLinePixelsBresenham(x0, y0, x1, y1)
    default:
      throw new Error(`Unsupported line algorithm: ${algorithm}`)
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
 * 解析 CSS background-position 值
 * @param backgroundPosition 背景位置設定
 * @param containerWidth 容器寬度
 * @param containerHeight 容器高度
 * @param imgWidth 圖片寬度
 * @param imgHeight 圖片高度
 * @returns 解析後的 x 和 y 偏移量（0-1 之間的比例）
 */
function parseBackgroundPosition(
  backgroundPosition: BackgroundPosition,
  containerWidth: number,
  containerHeight: number,
  imgWidth: number,
  imgHeight: number,
): { x: number, y: number } {
  if (typeof backgroundPosition !== 'string') {
    return { x: 0.5, y: 0.5 } // 預設居中
  }

  const position = backgroundPosition.toLowerCase().trim()

  // 處理關鍵字組合
  const keywords = position.split(/\s+/)
  let x = 0.5 // 預設水平居中
  let y = 0.5 // 預設垂直居中

  for (const keyword of keywords) {
    switch (keyword) {
      // 水平位置
      case 'left':
        x = 0
        break
      case 'right':
        x = 1
        break
      case 'center':
        if (keywords.length === 1) {
          x = 0.5
          y = 0.5
        }
        break

      // 垂直位置
      case 'top':
        y = 0
        break
      case 'bottom':
        y = 1
        break

      // 處理百分比和像素值
      default:
        if (keyword.endsWith('%')) {
          const percentage = Number.parseFloat(keyword) / 100
          if (!Number.isNaN(percentage)) {
            if (keywords.indexOf(keyword) === 0 || keyword.includes('left') || keyword.includes('right')) {
              x = Math.max(0, Math.min(1, percentage))
            } else {
              y = Math.max(0, Math.min(1, percentage))
            }
          }
        } else if (keyword.endsWith('px')) {
          const pixels = Number.parseFloat(keyword)
          if (!Number.isNaN(pixels)) {
            if (keywords.indexOf(keyword) === 0) {
              x = Math.max(0, Math.min(1, pixels / (containerWidth - imgWidth)))
            } else {
              y = Math.max(0, Math.min(1, pixels / (containerHeight - imgHeight)))
            }
          }
        }
        break
    }
  }

  return { x, y }
}

/**
 * 計算背景尺寸和位置，類似 CSS background-size 和 background-position
 * @param backgroundSize 背景尺寸設定
 * @param backgroundPosition 背景位置設定
 * @param imgWidth 圖片原始寬度
 * @param imgHeight 圖片原始高度
 * @param containerWidth 容器寬度
 * @param containerHeight 容器高度
 * @returns 計算後的圖片尺寸和偏移
 */
function calculateBackgroundSize(
  backgroundSize: BackgroundSize,
  backgroundPosition: BackgroundPosition,
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
): { width: number, height: number, offsetX: number, offsetY: number } {
  // 輔助函數：計算縮放比例並應用
  const applyScale = (scale: number) => ({
    width: imgWidth * scale,
    height: imgHeight * scale,
  })

  // 輔助函數：使用 contain 作為預設
  const getContainSize = () => {
    const scale = Math.min(containerWidth / imgWidth, containerHeight / imgHeight)
    return applyScale(scale)
  }

  // 計算縮放後的尺寸
  const { width: scaledWidth, height: scaledHeight } = (() => {
    switch (backgroundSize) {
      case 'contain':
        return getContainSize()

      case 'cover': {
        const scale = Math.max(containerWidth / imgWidth, containerHeight / imgHeight)
        return applyScale(scale)
      }

      case 'auto':
        return { width: imgWidth, height: imgHeight }

      default: {
        if (typeof backgroundSize !== 'string') return getContainSize()

        // 處理百分比
        if (backgroundSize.endsWith('%')) {
          const percentage = Number.parseFloat(backgroundSize) / 100
          return {
            width: containerWidth * percentage,
            height: containerHeight * percentage,
          }
        }

        // 處理像素值
        if (backgroundSize.endsWith('px')) {
          const pixels = Number.parseFloat(backgroundSize)
          const scale = pixels / Math.min(imgWidth, imgHeight)
          return applyScale(scale)
        }

        // 處理純數字（倍數）
        const scale = Number.parseFloat(backgroundSize)
        return Number.isNaN(scale) ? getContainSize() : applyScale(scale)
      }
    }
  })()

  // 解析背景位置
  const position = parseBackgroundPosition(
    backgroundPosition,
    containerWidth,
    containerHeight,
    scaledWidth,
    scaledHeight,
  )

  // 根據背景位置計算偏移
  const offsetX = (containerWidth - scaledWidth) * position.x
  const offsetY = (containerHeight - scaledHeight) * position.y

  return {
    width: scaledWidth,
    height: scaledHeight,
    offsetX,
    offsetY,
  }
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
 * 生成圓形釘子位置
 */
function generateCirclePins(center: Point, radius: number, points: number): Point[] {
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
 * 生成方形釘子位置
 */
function generateSquarePins(center: Point, radius: number, points: number): Point[] {
  const pins: Point[] = []
  const sideLength = radius * 2
  const perimeter = sideLength * 4

  for (let i = 0; i < points; i++) {
    const progress = i / points
    const perimeterPos = progress * perimeter
    let x: number, y: number

    if (perimeterPos <= sideLength) {
      // 上邊
      x = center.x - radius + perimeterPos
      y = center.y - radius
    } else if (perimeterPos <= sideLength * 2) {
      // 右邊
      x = center.x + radius
      y = center.y - radius + (perimeterPos - sideLength)
    } else if (perimeterPos <= sideLength * 3) {
      // 下邊
      x = center.x + radius - (perimeterPos - sideLength * 2)
      y = center.y + radius
    } else {
      // 左邊
      x = center.x - radius
      y = center.y + radius - (perimeterPos - sideLength * 3)
    }

    pins.push({
      x: Math.round(x),
      y: Math.round(y),
    })
  }
  return pins
}

/**
 * 生成菱形釘子位置
 */
function generateDiamondPins(center: Point, radius: number, points: number): Point[] {
  const pins: Point[] = []

  for (let i = 0; i < points; i++) {
    const progress = i / points
    const angle = progress * 2 * Math.PI

    // 將圓形座標轉換為菱形座標
    let x: number, y: number
    const quadrant = Math.floor(angle / (Math.PI / 2))
    const localAngle = angle % (Math.PI / 2)

    switch (quadrant) {
      case 0: // 右上
        x = center.x + radius * (1 - localAngle / (Math.PI / 2))
        y = center.y - radius * (localAngle / (Math.PI / 2))
        break
      case 1: // 右下
        x = center.x + radius * (localAngle / (Math.PI / 2))
        y = center.y + radius * (1 - localAngle / (Math.PI / 2))
        break
      case 2: // 左下
        x = center.x - radius * (1 - localAngle / (Math.PI / 2))
        y = center.y + radius * (localAngle / (Math.PI / 2))
        break
      default: // 左上
        x = center.x - radius * (localAngle / (Math.PI / 2))
        y = center.y - radius * (1 - localAngle / (Math.PI / 2))
        break
    }

    pins.push({
      x: Math.round(x),
      y: Math.round(y),
    })
  }
  return pins
}

/**
 * 生成正多邊形釘子位置
 */
function generatePolygonPins(center: Point, radius: number, points: number, sides: number = 6, containerWidth?: number, containerHeight?: number): Point[] {
  const pins: Point[] = []
  const polygonSides = Math.max(3, Math.min(20, sides)) // 限制邊數在 3-20 之間

  // 使用實際的容器尺寸，如果沒有提供則使用半徑計算
  const actualWidth = containerWidth || radius * 2
  const actualHeight = containerHeight || radius * 2

  // 計算多邊形在容器中的最佳外接圓半徑
  const optimalRadius = calculateOptimalPolygonRadius(polygonSides, actualWidth, actualHeight)

  // 計算多邊形的最佳起始角度，確保垂直居中
  let startAngle = -Math.PI / 2 // 預設從頂部開始

  // 對於某些多邊形，調整起始角度以實現更好的垂直居中
  if (polygonSides % 2 === 0) {
    // 偶數邊：調整角度讓多邊形更好地垂直居中
    startAngle = -Math.PI / 2 + Math.PI / polygonSides
  }

  // 生成正多邊形的頂點
  const polygonVertices: Point[] = []

  for (let i = 0; i < polygonSides; i++) {
    const angle = (i * 2 * Math.PI) / polygonSides + startAngle

    polygonVertices.push({
      x: center.x + optimalRadius * Math.cos(angle),
      y: center.y + optimalRadius * Math.sin(angle),
    })
  }

  // 計算實際的邊界框並調整位置以確保完美居中
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const vertex of polygonVertices) {
    minX = Math.min(minX, vertex.x)
    maxX = Math.max(maxX, vertex.x)
    minY = Math.min(minY, vertex.y)
    maxY = Math.max(maxY, vertex.y)
  }

  // 計算當前多邊形的中心偏移
  const currentCenterX = (minX + maxX) / 2
  const currentCenterY = (minY + maxY) / 2

  // 計算需要的偏移量來實現完美居中
  const offsetX = center.x - currentCenterX
  const offsetY = center.y - currentCenterY

  // 應用偏移量，確保多邊形完美居中
  for (const vertex of polygonVertices) {
    vertex.x += offsetX
    vertex.y += offsetY
  }

  // 計算多邊形的總周長
  let totalPerimeter = 0
  for (let i = 0; i < polygonVertices.length; i++) {
    const current = polygonVertices[i]
    const next = polygonVertices[(i + 1) % polygonVertices.length]
    const distance = Math.sqrt(
      (next.x - current.x) ** 2 + (next.y - current.y) ** 2,
    )
    totalPerimeter += distance
  }

  // 沿著多邊形邊緣均勻分佈釘子
  let currentDistance = 0
  let currentEdge = 0
  let edgeProgress = 0

  for (let i = 0; i < points; i++) {
    const targetDistance = (i / points) * totalPerimeter

    // 找到目標距離對應的邊和位置
    while (currentDistance < targetDistance && currentEdge < polygonVertices.length) {
      const current = polygonVertices[currentEdge]
      const next = polygonVertices[(currentEdge + 1) % polygonVertices.length]
      const edgeLength = Math.sqrt(
        (next.x - current.x) ** 2 + (next.y - current.y) ** 2,
      )

      if (currentDistance + edgeLength >= targetDistance) {
        // 目標點在當前邊上
        edgeProgress = (targetDistance - currentDistance) / edgeLength
        break
      }

      currentDistance += edgeLength
      currentEdge = (currentEdge + 1) % polygonVertices.length
      edgeProgress = 0
    }

    // 在當前邊上插值計算釘子位置
    const current = polygonVertices[currentEdge]
    const next = polygonVertices[(currentEdge + 1) % polygonVertices.length]

    const x = current.x + (next.x - current.x) * edgeProgress
    const y = current.y + (next.y - current.y) * edgeProgress

    pins.push({
      x: Math.round(x),
      y: Math.round(y),
    })
  }

  return pins
}

/**
 * 計算多邊形的最大內切圓半徑
 * @param sides 多邊形邊數
 * @param containerWidth 容器寬度
 * @param containerHeight 容器高度
 * @returns 最大內切圓半徑
 */
function calculateOptimalPolygonRadius(sides: number, containerWidth: number, containerHeight: number): number {
  // 直接返回容器能容納的最大圓形半徑作為內切圓半徑
  return Math.min(containerWidth, containerHeight) / 2
}

/**
 * 解析 pinShape 字符串，提取形狀和參數
 */
function parsePinShape(pinShape: PinShape): { shape: string, sides?: number } {
  if (typeof pinShape !== 'string') {
    return { shape: 'circle' }
  }

  // 檢查是否是帶數字的多邊形格式，如 "polygon5", "polygon-8", "polygon_12"
  const polygonMatch = pinShape.match(/^polygon[-_]?(\d+)$/i)
  if (polygonMatch) {
    const sides = Number.parseInt(polygonMatch[1], 10)
    return { shape: 'polygon', sides }
  }

  // 檢查基本形狀
  if (['circle', 'square', 'diamond', 'polygon'].includes(pinShape)) {
    return { shape: pinShape }
  }

  // 無效形狀，返回預設
  return { shape: 'circle' }
}

/**
 * 根據形狀生成釘子位置
 */
function generatePins(center: Point, radius: number, points: number, shape: PinShape, containerWidth?: number, containerHeight?: number): Point[] {
  const { shape: parsedShape, sides } = parsePinShape(shape)

  switch (parsedShape) {
    case 'circle':
      return generateCirclePins(center, radius, points)
    case 'square':
      return generateSquarePins(center, radius, points)
    case 'diamond':
      return generateDiamondPins(center, radius, points)
    case 'polygon':
      return generatePolygonPins(center, radius, points, sides, containerWidth, containerHeight)
    default:
      throw new Error(`Unsupported pin shape: ${parsedShape}`)
  }
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
  algorithm: LineAlgorithm,
): number {
  const linePixels = getLinePixels(algorithm, from.x, from.y, to.x, to.y)
  let score = 0
  const imgHeight = grayData.length
  const imgWidth = grayData[0].length

  for (const pixel of linePixels) {
    // 直接使用像素座標，因為 grayData 已經根據 backgroundSize 調整過了
    const imgX = Math.floor(pixel.x)
    const imgY = Math.floor(pixel.y)

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
  algorithm: LineAlgorithm,
): void {
  const linePixels = getLinePixels(algorithm, from.x, from.y, to.x, to.y)
  const imgHeight = grayData.length
  const imgWidth = grayData[0].length

  for (const pixel of linePixels) {
    // 直接使用像素座標，因為 grayData 已經根據 backgroundSize 調整過了
    const imgX = Math.floor(pixel.x)
    const imgY = Math.floor(pixel.y)

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
  const { imageGrayData, points, lines, lineColor, width, height, lineAlgorithm, backgroundSize, backgroundPosition, pinShape } = options

  const center = { x: width / 2, y: height / 2 }
  // 釘子圓圈保持在 canvas 邊緣，不受 backgroundSize 影響
  const radius = Math.min(width, height) / 2

  // 生成釘子位置
  const pins = generatePins(center, radius, points, pinShape, width, height)

  // 深拷貝圖像數據
  const mutableGrayData = imageGrayData.map(row => row.map(pixel => [...pixel]))
  const colorIntensity = parseLineColorIntensity(lineColor) * 0.09

  console.log('Color Intensity:', colorIntensity)
  console.log('Line Algorithm:', lineAlgorithm)
  console.log('Background Size:', backgroundSize)
  console.log('Background Position:', backgroundPosition)
  console.log('Pin Shape:', pinShape)

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
        lineAlgorithm,
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
      lineAlgorithm,
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
  lineAlgorithm: 'xiaolin-wu',
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  pinShape: 'circle',
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
      keys: ['lineAlgorithm'],
      validate: v => ['xiaolin-wu', 'bresenham'].includes(v),
      getMessage: (k, v) => `"${v}" is not a valid line algorithm. Algorithm must be either "xiaolin-wu" or "bresenham".`,
    },
    {
      keys: ['backgroundSize'],
      validate: (v: BackgroundSize) => {
        if (typeof v === 'string') {
          // 檢查預定義值
          if (['contain', 'cover', 'auto'].includes(v)) return true
          // 檢查百分比
          if (v.endsWith('%')) {
            const percentage = Number.parseFloat(v)
            return !Number.isNaN(percentage) && percentage > 0 && percentage <= 1000
          }
          // 檢查像素值
          if (v.endsWith('px')) {
            const pixels = Number.parseFloat(v)
            return !Number.isNaN(pixels) && pixels > 0
          }
          // 檢查純數字
          const scale = Number.parseFloat(v)
          return !Number.isNaN(scale) && scale > 0 && scale <= 10
        }
        return false
      },
      getMessage: (k, v) => `"${v}" is not a valid background size. Use "contain", "cover", "auto", percentage (e.g., "50%"), pixels (e.g., "100px"), or a number (e.g., "2").`,
    },
    {
      keys: ['backgroundPosition'],
      validate: (v: BackgroundPosition) => {
        if (typeof v !== 'string') return false

        const position = v.toLowerCase().trim()

        // 檢查預定義關鍵字組合
        const validKeywords = [
          'center',
          'top',
          'bottom',
          'left',
          'right',
          'top left',
          'top right',
          'bottom left',
          'bottom right',
          'left top',
          'right top',
          'left bottom',
          'right bottom',
        ]

        if (validKeywords.includes(position)) return true

        // 檢查百分比和像素值組合
        const parts = position.split(/\s+/)
        if (parts.length <= 2) {
          return parts.every((part) => {
            // 檢查關鍵字
            if (['center', 'top', 'bottom', 'left', 'right'].includes(part)) return true

            // 檢查百分比
            if (part.endsWith('%')) {
              const percentage = Number.parseFloat(part)
              return !Number.isNaN(percentage) && percentage >= 0 && percentage <= 100
            }

            // 檢查像素值
            if (part.endsWith('px')) {
              const pixels = Number.parseFloat(part)
              return !Number.isNaN(pixels)
            }

            return false
          })
        }

        return false
      },
      getMessage: (k, v) => `"${v}" is not a valid background position. Use keywords like "center", "top left", "50% 25%", or "10px 20px".`,
    },
    {
      keys: ['pinShape'],
      validate: (v: PinShape) => {
        if (typeof v !== 'string') return false

        // 檢查基本形狀
        if (['circle', 'square', 'diamond', 'polygon'].includes(v)) return true

        // 檢查帶數字的多邊形格式，如 "polygon5", "polygon-8", "polygon_12"
        const polygonMatch = v.match(/^polygon[-_]?(\d+)$/i)
        if (polygonMatch) {
          const sides = Number.parseInt(polygonMatch[1], 10)
          return sides >= 3 && sides <= 20 // 限制邊數在 3-20 之間
        }

        return false
      },
      getMessage: (k, v) => `"${v}" is not a valid pin shape. Pin shape must be "circle", "square", "diamond", "polygon", or "polygon" with a number (e.g., "polygon5", "polygon-8", "polygon_12"). Polygon sides must be between 3 and 20.`,
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

function getImageData(
  canvas: HTMLCanvasElement,
  colorSpace: ColorSpace = 'gray',
  containerWidth: number,
  containerHeight: number,
  backgroundSize: BackgroundSize,
  backgroundPosition: BackgroundPosition = 'center',
): number[][][] {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  // 創建目標尺寸的新 canvas
  const targetCanvas = document.createElement('canvas')
  const targetCtx = targetCanvas.getContext('2d')
  if (!targetCtx) throw new Error('Failed to get target canvas context')

  targetCanvas.width = containerWidth
  targetCanvas.height = containerHeight

  // 計算背景尺寸和位置
  const { width: scaledWidth, height: scaledHeight, offsetX, offsetY } = calculateBackgroundSize(
    backgroundSize,
    backgroundPosition,
    canvas.width,
    canvas.height,
    containerWidth,
    containerHeight,
  )

  // 清除目標 canvas（設為黑色背景，對應灰度值 255）
  targetCtx.fillStyle = '#000000'
  targetCtx.fillRect(0, 0, containerWidth, containerHeight)

  // 將原始圖片按照 backgroundSize 繪製到目標 canvas
  targetCtx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight)

  // 從目標 canvas 獲取圖像數據
  const imageData = targetCtx.getImageData(0, 0, containerWidth, containerHeight)
  const data = imageData.data

  const result: number[][][] = Array.from({ length: containerHeight }, () =>
    Array.from({ length: containerWidth }, () => []))

  let index = 0
  for (let y = 0; y < containerHeight; y++) {
    for (let x = 0; x < containerWidth; x++) {
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
      this.ctx = this.stringArtCanvas.getContext('2d')

      if (this.ctx) {
        // 設置 Canvas 渲染優化
        this.ctx.imageSmoothingEnabled = false // 禁用圖像平滑，避免模糊
        this.ctx.scale(this.dpr, this.dpr)
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
      res => getImageData(res, 'gray', this.el.clientWidth, this.el.clientHeight, this.options.backgroundSize, this.options.backgroundPosition),
    )
    const imageGrayData = await imagePipeline(this.options.image)

    console.log('Device Pixel Ratio:', this.dpr)
    console.log('Image Gray Width:', imageGrayData[0].length)
    console.log('Image Gray Height:', imageGrayData.length)

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
      lineAlgorithm: this.options.lineAlgorithm,
      backgroundSize: this.options.backgroundSize,
      backgroundPosition: this.options.backgroundPosition,
      pinShape: this.options.pinShape,
    })
  }

  destroy() {
    this.stringArtInstances.forEach(r => r.remove())
    this.stringArtInstances = []
    this.stringArtWrapper?.remove()
    this.stringArtCanvas = undefined
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
