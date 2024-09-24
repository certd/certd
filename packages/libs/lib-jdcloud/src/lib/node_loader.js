var util = require('./util')

util.crypto.lib = require('crypto')
util.Buffer = require('buffer').Buffer
util.url = require('url')
util.querystring = require('querystring')
util.environment = 'nodejs'
let JDCloud = require('./core')
JDCloud.fetch = require('node-fetch')
module.exports = JDCloud

require('./credentials')
