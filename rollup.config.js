import fs from 'node:fs'
import path from 'node:path'
import typescript from 'rollup-plugin-typescript2'
import terser from '@rollup/plugin-terser'

function getFolderNames(folderPath) {
  try {
    return fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter(f => f.isDirectory() && fs.existsSync(path.join(folderPath, f.name, 'package.json')))
      .map(folder => folder.name)
  } catch (err) {
    throw new Error(`Error reading folder: ${err}`)
  }
}

function getJsonData(folderPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(folderPath, 'package.json'), 'utf-8'))
  } catch (err) {
    throw new Error(`Error reading package.json: ${err}`)
  }
}

function createPlugins(packageJson, isMinified = true, isBanner = true) {
  const plugins = [typescript()]

  if (isMinified) {
    plugins.push(terser(
      {
        mangle: {
          properties: {
            regex: /^_/,
          },
        },
        compress: {
          unused: false,
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          if_return: true,
          join_vars: true,
          drop_console: false,
          drop_debugger: false,
          typeofs: false,
          passes: 4,
        },
      },
    ))
  }

  if (isBanner) {
    plugins.push({
      name: 'banner',
      renderChunk(code) {
        const banner = `
        /**
         * ${packageJson.name}
         * ${packageJson.description}
         *
         * @version ${packageJson.version}
         * @author ${packageJson.author.name}
         * @email ${packageJson.author.email}
         * @github ${packageJson.author.githubLink}
         * @license ${packageJson.license}
         * @link ${packageJson.homepage}
         */
        `.trim().replace(/^\s*\*/gm, ' *')

        return `${banner}\n${code}`
      },
    })
  }

  return plugins
}

function buildAllPackages() {
  return getFolderNames('packages')
    .map((packageName) => {
      const packagePath = path.join('packages', packageName)
      const packageJson = getJsonData(packagePath)

      return {
        input: path.join(packagePath, 'src/index.ts'),
        output: [
          {
            file: path.join(packagePath, 'dist/index.js'),
            format: 'cjs',
          },
          {
            file: path.join(packagePath, 'dist/index.mjs'),
            format: 'es',
          },
        ],
        plugins: createPlugins(packageJson),
      }
    })
}

export default buildAllPackages()
