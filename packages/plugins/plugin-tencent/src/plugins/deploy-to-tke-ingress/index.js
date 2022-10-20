import { AbstractTencentPlugin } from '../abstract-tencent.js'
import tencentcloud from 'tencentcloud-sdk-nodejs'
import { K8sClient } from '@certd/plugin-common'
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
      desc: '需要【上传到腾讯云】作为前置任务',
      input: {
        region: {
          title: '大区',
          value: 'ap-guangzhou',
          required: true
        },
        clusterId: {
          title: '集群ID',
          required: true,
          desc: '例如：cls-6lbj1vee',
          request: true
        },
        namespace: {
          title: '集群namespace',
          value: 'default',
          required: true
        },
        secreteName: {
          title: '证书的secret名称',
          required: true
        },
        ingressName: {
          title: 'ingress名称',
          required: true
        },
        ingressClass: {
          title: 'ingress类型',
          component: {
            name: 'a-select',
            options: [
              { value: 'qcloud' },
              { value: 'nginx' }
            ]
          },
          helper: '可选 qcloud / nginx'
        },
        clusterIp: {
          title: '集群内网ip',
          helper: '如果开启了外网的话，无需设置'
        },
        clusterDomain: {
          title: '集群域名',
          helper: '可不填，默认为:[clusterId].ccs.tencent-cloud.com'
        },
        /**
         * AccessProvider的key,或者一个包含access的具体的对象
         */
        accessProvider: {
          title: 'Access授权',
          helper: 'access授权',
          component: {
            name: 'access-selector',
            type: 'tencent'
          },
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
    if (props.clusterIp != null) {
      let clusterDomain = props.clusterDomain
      if (!clusterDomain) {
        clusterDomain = `${props.clusterId}.ccs.tencent-cloud.com`
      }
      // 修改内网解析ip地址
      k8sClient.setLookup({ [clusterDomain]: { ip: props.clusterIp } })
    }
    const ingressType = props.ingressClass || 'qcloud'
    if (ingressType === 'qcloud') {
      await this.patchQcloudCertSecret({ k8sClient, props, context })
    } else {
      await this.patchNginxCertSecret({ cert, k8sClient, props, context })
    }

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
    this.logger.info('注意：后续操作需要在【集群->基本信息】中开启外网或内网访问,https://console.cloud.tencent.com/tke2/cluster')
    return ret.Kubeconfig
  }

  async patchQcloudCertSecret ({ k8sClient, props, context }) {
    const { tencentCertId } = context
    if (tencentCertId == null) {
      throw new Error('请先将【上传证书到腾讯云】作为前置任务')
    }
    this.logger.info('腾讯云证书ID:', tencentCertId)
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

  async patchNginxCertSecret ({ cert, k8sClient, props, context }) {
    const crt = cert.crt
    const key = cert.key
    const crtBase64 = Buffer.from(crt).toString('base64')
    const keyBase64 = Buffer.from(key).toString('base64')

    const { namespace, secretName } = props

    const body = {
      data: {
        'tls.crt': crtBase64,
        'tls.key': keyBase64
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
