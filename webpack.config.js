const path = require('path')
const webpack = require('webpack')

module.exports = [
  {
    entry: path.join(__dirname, 'src', 'index.js'),
    devtool: 'source-map',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'index.js',
      publicPath: '/dist/'
    },
    module: {}
  }
]
