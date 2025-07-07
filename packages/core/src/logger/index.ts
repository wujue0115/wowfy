const titleBaseStyle = 'padding: 1px 6px; border-radius: 2px; font-weight: bold;'
const msgBaseStyle = 'background: none; font-weight: normal;'

export const logger = {
  info: (msg: string) => console.log(`%cWowfy%c ${msg}`, `background: #db8b08; ${titleBaseStyle}`, `color: #fba52f; ${msgBaseStyle}`),
  success: (msg: string) => console.log(`%cWowfy%c ${msg}`, `background: #c13547; ${titleBaseStyle}`, `color: #f15d69; ${msgBaseStyle}`),
  warn: (msg: string) => console.log(`%cWowfy%c ${msg}`, `background: #005692; ${titleBaseStyle}`, `color: #1979ba; ${msgBaseStyle}`),
  error: (msg: string) => console.log(`%cWowfy%c ${msg}`, `background: #008a52; ${titleBaseStyle}`, `color: #00b275; ${msgBaseStyle}`),
}
