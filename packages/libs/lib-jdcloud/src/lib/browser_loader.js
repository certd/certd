var util = require('./util')
util.crypto.lib = {
  createHash: require('create-hash'),
  createHmac: require('create-hmac')
}
util.Buffer = require('buffer/').Buffer
util.url = require('url/')
util.querystring = require('querystring/')
util.environment = 'js'

var JC = require('./core')

module.exports = JC
