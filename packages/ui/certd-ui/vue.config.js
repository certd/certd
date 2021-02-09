module.exports = {
  pages: {
    index: {
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
  }
}
