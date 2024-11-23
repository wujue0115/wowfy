export function isValidTimeFormat(input: string): boolean {
  const regex = /^(?:\d+(?:\.\d+)?|\.?\d+)(?:ms|s)$/
  return regex.test(input)
}

export function parseDuration(duration: string) {
  const time = Number.parseFloat(duration.split('m')[0].split('s')[0])
  const millisecond = time * (duration.includes('m') ? 1 : 1000)
  return millisecond
}
