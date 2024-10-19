import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '**/*.md',
    '**/rollup.config.js',
  ],
  rules: {
    '@typescript-eslint/no-unused-expressions': 'off',
  },
})
