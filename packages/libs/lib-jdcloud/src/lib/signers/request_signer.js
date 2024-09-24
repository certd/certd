module.exports = class RequestSigner {
  constructor (request) {
    this.request = request
  }

  setServiceClientId (id) {
    this.serviceClientId = id
  }

  getServiceClientId () {
    return this.serviceClientId
  }
}
