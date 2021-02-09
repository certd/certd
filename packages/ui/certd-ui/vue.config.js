module.exports = {
  pages: {
    index: {
      entry: 'src/main.js',
      // template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
      title: 'Cert-D'
    }
  },
  devServer: {
    proxy: {
      '/': {
        target: 'http://localhost:3000/'
      }
    }
  },
  css: {
    loaderOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
}
