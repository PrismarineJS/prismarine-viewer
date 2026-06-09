const supportedVersions = ['1.8.8', '1.9.4', '1.10.2', '1.11.2', '1.12.2', '1.13.2', '1.14.4', '1.15.2', '1.16.1', '1.16.4', '1.17.1', '1.18.1', '1.19', '1.20.1', '1.21.1', '1.21.4']

const lastOfMajor = {}
for (const version of supportedVersions) {
  const major = toMajor(version)
  if (lastOfMajor[major]) {
    if (minor(lastOfMajor[major]) < minor(version)) {
      lastOfMajor[major] = version
    }
  } else {
    lastOfMajor[major] = version
  }
}

function toMajor (version) {
  const [a, b] = (version + '').split('.')
  return a + '.' + b
}

function minor (version) {
  const [, , c] = (version + '.0').split('.')
  return parseInt(c, 10)
}

function getVersion (version) {
  if (supportedVersions.indexOf(version) !== -1) return version
  const major = toMajor(version)
  if (lastOfMajor[major] === undefined) {
    return null
  }
  return lastOfMajor[toMajor(version)]
}

module.exports = { getVersion, supportedVersions }
