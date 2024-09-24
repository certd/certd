require('node-fetch')

var JDCloud = {
  util: require('./util'),
  // todo swaggerVar
  VERSION: ''
}

module.exports = JDCloud

require('./service')
require('./config')
require('./request')
