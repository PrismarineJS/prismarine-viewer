const path = require('path')
const esbuild = require('esbuild')

const blockedIndexFiles = ['blocksB2J', 'blocksJ2B', 'blockMappings', 'steve', 'recipes']
const allowedWorkerFiles = ['blocks', 'blockCollisionShapes', 'tints', 'blockStates',
  'biomes', 'features', 'version', 'legacy', 'versions', 'protocolVersions']

function browserUtilsPlugin () {
  return {
    name: 'browser-utils',
    setup (build) {
      build.onResolve({ filter: /^(\.\.?\/)*utils$/ }, args => {
        const resolved = path.resolve(args.resolveDir, args.path)
        if (resolved.endsWith(path.join('viewer', 'lib', 'utils'))) {
          return { path: path.resolve(__dirname, 'viewer/lib/utils.web.js') }
        }
      })
    }
  }
}

function minecraftDataPrunePlugin ({ blockedFiles, allowedFiles }) {
  return {
    name: 'minecraft-data-prune',
    setup (build) {
      build.onResolve({ filter: /\.json$/ }, args => {
        if (!args.resolveDir.includes(`node_modules${path.sep}minecraft-data`)) return

        const fileName = path.basename(args.path, '.json')
        const shouldPrune = blockedFiles
          ? blockedFiles.includes(fileName)
          : !allowedFiles.includes(fileName)

        if (shouldPrune) {
          return {
            path: fileName,
            namespace: 'empty-json'
          }
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'empty-json' }, () => ({
        contents: 'module.exports = []',
        loader: 'js'
      }))
    }
  }
}

function emptyModulePlugin (modules) {
  const escapedModules = modules.map(module => module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  return {
    name: 'empty-modules',
    setup (build) {
      build.onResolve({ filter: new RegExp(`^(${escapedModules.join('|')})$`) }, args => ({
        path: args.path,
        namespace: 'empty-module'
      }))

      build.onLoad({ filter: /.*/, namespace: 'empty-module' }, () => ({
        contents: 'module.exports = {}',
        loader: 'js'
      }))
    }
  }
}

async function build () {
  const common = {
    bundle: true,
    minify: true,
    platform: 'browser',
    target: 'es2019',
    format: 'iife',
    logLevel: 'info',
    inject: [path.resolve(__dirname, 'viewer/esbuild-globals.js')],
    define: {
      global: 'globalThis',
      'globalThis.isElectron': 'false'
    },
    plugins: [
      browserUtilsPlugin(),
      emptyModulePlugin(['zlib'])
    ]
  }

  await Promise.all([
    esbuild.build({
      ...common,
      entryPoints: ['lib/index.js'],
      outfile: 'public/index.js',
      plugins: [
        ...common.plugins,
        minecraftDataPrunePlugin({ blockedFiles: blockedIndexFiles })
      ]
    }),
    esbuild.build({
      ...common,
      entryPoints: ['viewer/lib/worker.js'],
      outfile: 'public/worker.js',
      plugins: [
        ...common.plugins,
        minecraftDataPrunePlugin({ allowedFiles: allowedWorkerFiles })
      ]
    })
  ])
}

build().catch(err => {
  console.error(err)
  process.exit(1)
})
