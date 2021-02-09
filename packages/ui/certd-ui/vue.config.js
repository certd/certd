const CompressionWebpackPlugin = require('compression-webpack-plugin')

// 设置不参与构建的库
const externals = {}
// cdnDependencies.forEach(pkg => { externals[pkg.name] = pkg.library })

module.exports = {
  lintOnSave: true,
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
  },
  configureWebpack: config => {
    const configNew = {}
    if (process.env.NODE_ENV === 'production') {
      configNew.externals = externals
      configNew.plugins = [
        // gzip
        new CompressionWebpackPlugin({
          filename: '[path].gz[query]',
          test: new RegExp('\\.(' + ['js', 'css'].join('|') + ')$'),
          threshold: 5120,
          minRatio: 0.8,
          deleteOriginalAssets: false
        })
      ]
    }
    return configNew
  }
}
