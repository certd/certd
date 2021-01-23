module.exports = {
  devServer: {
    proxy: {
      '/': {
        target: 'http://localhost:3000/'
      }
    }
  }
}
