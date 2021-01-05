const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
console.log(CleanWebpackPlugin)

module.exports = {
  devtool: 'source-map',
  target: 'node',
  entry: './src/index.js',
  output: {
    filename: 'executor.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'certdExecutor',
    libraryTarget: 'umd'
  },
  plugins: [
    new CleanWebpackPlugin()
  ],
  mode: 'production'
  // mode: 'development',
  // optimization: {
  //   usedExports: true
  // }
}
