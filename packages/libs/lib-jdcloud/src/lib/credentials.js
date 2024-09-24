var JDCloud = require('./core')

JDCloud.Credentials = class Credentials {
  constructor () {
    this.expired = false
    this.expireTime = null

    if (arguments.length === 1 && typeof arguments[0] === 'object') {
      var creds = arguments[0].credentials || arguments[0]
      this.accessKeyId = creds.accessKeyId
      this.secretAccessKey = creds.secretAccessKey
      this.sessionToken = creds.sessionToken
    } else {
      this.accessKeyId = arguments[0]
      this.secretAccessKey = arguments[1]
      this.sessionToken = arguments[2]
    }
  }
}

module.exports = JDCloud.Credentials
