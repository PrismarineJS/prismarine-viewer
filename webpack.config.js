// eslint-disable-next-line no-unused-vars
const webpack = require('webpack')
const path = require('path')

const indexConfig = {
  entry: './lib/index.js',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, './public'),
    filename: './index.js'
  },
  plugins: [
    // fix "process is not defined" error:
    new webpack.ProvidePlugin({
      process: 'process/browser'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.NormalModuleReplacementPlugin(
      // eslint-disable-next-line
      /viewer[\/|\\]lib[\/|\\]utils/,
      './utils.web.js'
    )
  ]
}

const workerConfig = {
  entry: './viewer/lib/worker.js',
  mode: 'production',
  output: {
    path: path.join(__dirname, '/public'),
    filename: './worker.js'
  },
  plugins: [
    // fix "process is not defined" error:
    new webpack.ProvidePlugin({
      process: 'process/browser'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ]
}

module.exports = [indexConfig, workerConfig]
