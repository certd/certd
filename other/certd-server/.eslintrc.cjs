module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: '2020'
  },
  parser: 'babel-eslint',
  extends: ['standard'],
  env: {
    node: true
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}
