var JDCloud = require('./core')
var SignerV2 = require('./signers/v2')

JDCloud.Service = class Service {
  constructor (serviceId, config = {}) {
    this.serviceId = serviceId
    this.init(config)
  }

  init (config) {
    // 某个服务类型的全局配置
    var serviceConfig = JDCloud.config[this.serviceId]
    // 全局配置
    this.config = new JDCloud.Config(JDCloud.config)
    if (serviceConfig) {
      this.config.update(serviceConfig, true)
    }
    if (config) {
      if (!this.config.endpoint.host && !config.endpoint) {
        config.endpoint = config._defaultEndpoint
      }
      delete config._defaultEndpoint
      this.config.update(config, true)
    }
  }

  makeRequest (
    path,
    httpMethod,
    pathParams,
    queryParams,
    headerParams,
    formParams,
    postBody,
    contentTypes,
    accepts,
    returnType,
    callback
  ) {
    var request = new JDCloud.JCRequest(
      this,
      path,
      httpMethod,
      pathParams,
      queryParams,
      headerParams,
      formParams,
      postBody,
      contentTypes,
      accepts,
      returnType
    )

    var signer = new SignerV2(request, this.serviceId)

    return this.config.getCredentials().then(() => {
      signer.addAuthorization(this.config.credentials)
      return JDCloud.fetch(signer.request.request).then(response => {
        return response.json().then(
          result => {
            result.responseObj = response
            if (response.ok) {
              return result
            }
            return Promise.reject(result)
          },
          error => {
            error.responseObj = response
            if (error.type === 'invalid-json') {
              // oss没有返回json
              if (response.ok) {
                return Promise.resolve({
                  requestId: response.headers.get('x-jdcloud-request-id') || ''
                })
              } else {
                /* eslint-disable */
                return Promise.reject({
                  requestId: response.headers.get('x-jdcloud-request-id') || ''
                })
                /* eslint-enable */
              }
            }
            throw error
          }
        )
      })
    })
  }

  buildCollectionParam (param, collectionFormat) {
    if (param === null || param === undefined) {
      return param
    }
    switch (collectionFormat) {
      case 'csv':
        return param.map(this.paramToString).join(',')
      case 'ssv':
        return param.map(this.paramToString).join(' ')
      case 'tsv':
        return param.map(this.paramToString).join('\t')
      case 'pipes':
        return param.map(this.paramToString).join('|')
      case 'multi':
        // return the array directly as SuperAgent will handle it as expected
        return param.map(this.paramToString)
      default:
        throw new Error('Unknown collection format: ' + collectionFormat)
    }
  }

  /**
   *  filter is a special type of array
   *  only contains:
   *  [
   *      { name: someString , values:[ someString, someString ] ,operator: someString}
   *  ]
   *
   */
  buildFilterParam (param, key) {
    var result = {}
    if (Array.isArray(param)) {
      let index = 0
      for (var i = 0; i < param.length; i++) {
        var obj = param[i]

        // 兼容空字符串
        if (obj.values !== '' && !Array.isArray(obj.values)) {
          throw new Error('The type of filters.values should be Array!')
        }
        if (obj.name && obj.values) {
          if (!obj.values.length) continue
          result[`${key}.${index + 1}.name`] = obj.name
          for (var j = 0; j < obj.values.length; j++) {
            var someString = obj.values[j]
            result[`${key}.${index + 1}.values.${j + 1}`] = someString
          }
          if (obj.operator) {
            result[`${key}.${index + 1}.operator`] = obj.operator
          }
          index++
        }
      }
    }
    return result
  }

  buildTagFilterParam (param = [], key) {
    var result = {}
    if (!Array.isArray(param)) {
      throw new Error(`The type of param 'param' should be Array!`)
    }

    for (var i = 0; i < param.length; i++) {
      var obj = param[i]

      if (obj.values && !Array.isArray(obj.values)) {
        throw new Error(
          `The type of param 'param[${i}].values' should be Array or NULL!`
        )
      }

      if (obj.key) {
        result[`${key}.${i + 1}.key`] = obj.key

        if (obj.values) {
          for (var j = 0; j < obj.values.length; j++) {
            var someString = obj.values[j]
            result[`${key}.${i + 1}.values.${j + 1}`] = someString
          }
        }
      }
    }
    return result
  }

  buildSortParam (param = [], key) {
    var result = {}
    if (!Array.isArray(param)) {
      throw new Error(`The type of param 'param' should be Array!`)
    }

    var index = 0
    for (var i = 0; i < param.length; i++) {
      var obj = param[i]

      if (obj.name && obj.direction) {
        index++
        result[`${key}.${index}.name`] = obj.name
        result[`${key}.${index}.direction`] = obj.direction
      }
    }
    return result
  }

  // arr=[a,b,c] =>  arr={arr1:a, arr2:b, arr3:c}
  buildArrayParam (param = [], key) {
    var result = {}
    if (!Array.isArray(param)) {
      throw new Error(`The type of param 'param' should be Array!`)
    }

    for (var i = 0; i < param.length; i++) {
      var value = param[i]
      result[`${key}.${i + 1}`] = value
    }
    return result
  }

  /**
   * Returns a string representation for an actual parameter.
   * @param param The actual parameter.
   * @returns {String} The string representation of <code>param</code>.
   */
  paramToString (param) {
    if (param === undefined || param === null) {
      return ''
    }
    if (param instanceof Date) {
      return param.toJSON()
    }

    return param.toString()
  }

  static hasService (id) {
    return JDCloud.Service._services.hasOwnProperty(id)
  }
}
JDCloud.Service._services = {}

module.exports = JDCloud.Service
