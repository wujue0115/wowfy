import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" assert { type: "json" };

const banner = `
/**
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version ${pkg.version}
 * @author ${pkg.author.name}
 * @email ${pkg.author.email}
 * @github ${pkg.author.githubLink}
 * @license ${pkg.license}
 * @link ${pkg.homepage}
 */
`.trim();

const uglifyOpts = {
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
  output: {
    preamble: banner,
  },
};

const baseConfig = {
  plugins: [typescript(), terser(uglifyOpts)],
};

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/wowfy.esm.js",
        format: "es",
      },
    ],
    ...baseConfig,
  },
  {
    input: "src/iife.ts",
    output: [
      {
        file: "dist/wowfy.iife.js",
        format: "iife",
        name: "Wowfy",
      },
    ],
    ...baseConfig,
  },
];
