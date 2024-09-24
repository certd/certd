var JDCloud = require('./core')

let defaultValues = {
  credentials: null,
  regionId: null,
  apiVersions: null,
  endpoint: {},
  version: {},
  logger: function (string, level = 'INFO') {
    // level: INFO / DEBUG / ERROR / WARN
    console.log(string)
  }
}
JDCloud.Config = class Config {
  constructor (options = {}) {
    options = this.extractCredentials(options)

    JDCloud.util.each.call(this, defaultValues, function (key, value) {
      if (options[key] === undefined) {
        this[key] = value
      } else {
        this[key] = options[key]
      }
    })
    JDCloud.util.each.call(this, JDCloud.Service._services, function (
      key,
      value
    ) {
      if (options[key] !== undefined) {
        this[key] = options[key]
      }
    })
  }

  extractCredentials (options) {
    if (options.accessKeyId && options.secretAccessKey) {
      options = Object.assign({}, options)
      options.credentials = new JDCloud.Credentials(options)
    }
    return options
  }

  getCredentials () {
    var p = new Promise((resolve, reject) => {
      if (this.credentials) {
        if (typeof this.credentials.get === 'function') {
        } else if (
          this.credentials.accessKeyId &&
          this.credentials.secretAccessKey
        ) {
          resolve()
        } else {
          reject(new Error('missing credentials'))
        }
      } else if (this.credentialProvider) {
      } else {
        reject(new Error('get credentials failed'))
      }
    })

    return p
  }

  update (options, allowUnknownKeys = false) {
    options = this.extractCredentials(options)
    JDCloud.util.each.call(this, options, function (key, value) {
      if (
        allowUnknownKeys ||
        defaultValues.hasOwnProperty(key) ||
        JDCloud.Service.hasService(key)
      ) {
        this[key] = options[key]
      }
    })
  }
}

JDCloud.config = new JDCloud.Config()
