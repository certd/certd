const path = require('path')

module.exports = {
  target: 'node',
  entry: './src/index.js',
  output: {
    filename: 'main.cjs',
    path: path.resolve(__dirname, 'dist')
  }
}
