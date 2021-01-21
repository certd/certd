export default {
  devServer: {
    proxy: {
      '/': {
        target: 'http://localhost:3000/'
      }
    }
  }
}
