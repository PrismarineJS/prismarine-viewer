const webpack = require('webpack')
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

const config = {
  mode: 'production',
  entry: path.resolve(__dirname, './index.js'),
  output: {
    path: path.resolve(__dirname, './public'),
    filename: './index.js'
  },
  resolve: {
    fallback: {
      zlib: require.resolve('browserify-zlib'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      events: require.resolve('events/'),
      assert: require.resolve('assert/')
    }
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
      /prismarine-viewer[/|\\]viewer[/|\\]lib[/|\\]utils/,
      './utils.web.js'
    ),
    new CopyPlugin({
      patterns: [
        { from: '../../public/blocksStates/', to: './blocksStates/' },
        { from: '../../public/textures/*.png', to: './textures/' },
        { from: '../../public/worker.js', to: './' },
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
  externals: [
    // This removes some large unnecessary data from the bundle
    function (req, cb) {
      if (req.context.includes('minecraft-data') && req.request.endsWith('.json')) {
         const fileName = req.request.split('/').pop().replace('.json', '')
        const blocked = ['blocksB2J', 'blocksJ2B', 'blockMappings', 'steve', 'recipes']
        if (blocked.includes(fileName)) {
          cb(null, [])
          return
        }
      }
      cb()
    }
  ]
}

module.exports = config
