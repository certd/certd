import { AbstractTencentPlugin } from '../../tencent/abstract-tencent.js'
import tencentcloud from 'tencentcloud-sdk-nodejs'
import { K8sClient } from '../../utils/util.k8s.client.js'

export class DeployCertToTencentTKEIngress extends AbstractTencentPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'deployCertToTencentTKEIngress',
      label: '部署到腾讯云TKE-ingress',
      input: {
        region: {
          label: '大区',
          value: 'ap-guangzhou'
        },
        clusterId: {
          label: '集群ID',
          required: true,
          desc: '例如：cls-6lbj1vee'
        },
        namespace: {
          label: '集群的namespace',
          value: 'default'
        },
        secreteName: {
          type: [String, Array],
          label: '证书的secret名称',
          desc: '支持多个（传入数组）'
        },
        ingressName: {
          type: [String, Array],
          label: 'ingress名称',
          desc: '支持多个（传入数组）'
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含accessKeyId与accessKeySecret的对象',
          options: 'accessProviders[type=tencent]',
          required: true
        }
      },
      output: {

      }
    }
  }

  async execute ({ cert, props, context }) {
    const accessProvider = this.getAccessProvider(props.accessProvider)
    const tkeClient = this.getTkeClient(accessProvider, props.region)
    const kubeConfigStr = await this.getTkeKubeConfig(tkeClient, props.clusterId)

    this.logger.info('kubeconfig已成功获取')
    const k8sClient = new K8sClient(kubeConfigStr)
    await this.patchCertSecret({ k8sClient, props, context })
    await this.sleep(2000) // 停留2秒，等待secret部署完成
    await this.restartIngress({ k8sClient, props })

    return true
  }

  getTkeClient (accessProvider, region = 'ap-guangzhou') {
    const TkeClient = tencentcloud.tke.v20180525.Client
    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey
      },
      region,
      profile: {
        httpProfile: {
          endpoint: 'tke.tencentcloudapi.com'
        }
      }
    }

    return new TkeClient(clientConfig)
  }

  async getTkeKubeConfig (client, clusterId) {
    // Depends on tencentcloud-sdk-nodejs version 4.0.3 or higher
    const params = {
      ClusterId: clusterId
    }
    const ret = await client.DescribeClusterKubeconfig(params)
    this.checkRet(ret)
    return ret.Kubeconfig
  }

  async patchCertSecret ({ k8sClient, props, context }) {
    const { tencentCertId } = context
    if (tencentCertId == null) {
      throw new Error('请先将【上传证书到腾讯云】作为前置任务')
    }
    const certIdBase64 = Buffer.from(tencentCertId).toString('base64')

    const { namespace, secretName } = props

    const body = {
      data: {
        qcloud_cert_id: certIdBase64
      },
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd')
        }
      }
    }
    let secretNames = secretName
    if (typeof secretName === 'string') {
      secretNames = [secretName]
    }
    for (const secret of secretNames) {
      await k8sClient.patchSecret({ namespace, secretName: secret, body })
      this.logger.info(`CertSecret已更新:${secret}`)
    }
  }

  async restartIngress ({ k8sClient, props }) {
    const { namespace, ingressName } = props

    const body = {
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd')
        }
      }
    }
    let ingressNames = ingressName
    if (typeof ingressName === 'string') {
      ingressNames = [ingressName]
    }
    for (const ingress of ingressNames) {
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body })
      this.logger.info(`ingress已重启:${ingress}`)
    }
  }
}
