import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      '**/*.md',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'style/brace-style': ['error', '1tbs'],
      'style/nonblock-statement-body-position': ['error', 'beside', { overrides: {} }],
      'antfu/if-newline': 'off',
    },
  },
)
