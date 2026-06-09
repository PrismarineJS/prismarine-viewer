module.exports = {
  mineflayer: require('./lib/mineflayer'),
  standalone: require('./lib/standalone'),
  headless: require('./lib/headless'),
  viewer: require('./viewer'),
  supportedVersions: require('./viewer').supportedVersions
}
