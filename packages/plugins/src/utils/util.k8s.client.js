import kubernetesClient from 'kubernetes-client'
import { util } from '@certd/api'
import Request from 'kubernetes-client/backends/request/index.js'
const { KubeConfig, Client } = kubernetesClient
const logger = util.logger
export class K8sClient {
  constructor (kubeConfigStr) {
    const kubeconfig = new KubeConfig()
    kubeconfig.loadFromString(kubeConfigStr)

    const backend = new Request({ kubeconfig })
    this.client = new Client({ backend, version: '1.13' })
  }

  /**
   * 查询 secret列表
   * @param opts = {namespace:default}
   * @returns secretsList
   */
  async getSecret (opts) {
    const namespace = opts?.namespace || 'default'
    const secrets = await this.client.api.v1.namespaces(namespace).secrets.get()
    return secrets
  }

  /**
   * 创建Secret
   * @param opts {namespace:default, body:yamlStr}
   * @returns {Promise<*>}
   */
  async createSecret (opts) {
    const namespace = opts?.namespace || 'default'
    const created = await this.client.api.v1.namespaces(namespace).secrets.post({
      body: opts.body
    })
    logger.info('new secrets:', created)
    return created
  }

  async updateSecret (opts) {
    const namespace = opts?.namespace || 'default'
    const secretName = opts?.secretName
    if (secretName == null) {
      throw new Error('secretName 不能为空')
    }
    return await this.client.api.v1.namespaces(namespace).secrets(secretName).put({
      body: opts.body
    })
  }

  async patchSecret (opts) {
    const namespace = opts?.namespace || 'default'
    const secretName = opts?.secretName
    if (secretName == null) {
      throw new Error('secretName 不能为空')
    }
    return await this.client.api.v1.namespaces(namespace).secrets(secretName).patch({
      body: opts.body
    })
  }

  async getIngress (opts) {
    const namespace = opts?.namespace || 'default'
    const ingressName = opts?.ingressName
    if (!ingressName) {
      throw new Error('ingressName 不能为空')
    }
    return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses(ingressName).get()
  }

  async patchIngress (opts) {
    const namespace = opts?.namespace || 'default'
    const ingressName = opts?.ingressName
    if (!ingressName) {
      throw new Error('ingressName 不能为空')
    }
    return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses(ingressName).patch({
      body: opts.body
    })
  }
}
