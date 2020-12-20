const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

const config = {
  entry: path.resolve(__dirname, './index.js'),
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
      /prismarine-viewer\/viewer\/lib\/utils/,
      './utils.web.js'
    ),
    new CopyPlugin({
      patterns: [
        { from: '../../public/blocksStates/', to: './blocksStates/' },
        { from: '../../public/textures/', to: './textures/' },
        { from: '../../public/worker.js', to: './' },
        { from: '../../public/supportedVersions.json', to: './' }
      ]
    })
  ],

  devServer: {
    contentBase: path.resolve(__dirname, './public'),
    compress: true,
    inline: true,
    // open: true,
    hot: true,
    watchOptions: {
      ignored: /node_modules/
    }
  },
  devtool: 'eval-source-map'
}

module.exports = config
