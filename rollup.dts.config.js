import fs from 'node:fs'
import dts from 'rollup-plugin-dts'

export default fs
  .readdirSync('types', { withFileTypes: true })
  .filter(f => f.isDirectory())
  .map(({ name: packageName }) => {
    return {
      input: `types/${packageName}/src/index.d.ts`,
      output: [
        {
          file: `packages/${packageName}/dist/index.d.mts`,
          format: 'es',
        },
        {
          file: `packages/${packageName}/dist/index.d.ts`,
          format: 'es',
        },
      ],
      plugins: [dts()],
      onwarn(warning, handler) {
        if (warning.code === 'UNRESOLVED_IMPORT' && !warning.exporter?.startsWith('.')) {
          return
        }
        handler(warning)
      },
    }
  })
