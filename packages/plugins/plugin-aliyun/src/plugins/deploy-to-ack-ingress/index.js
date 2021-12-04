import { AbstractAliyunPlugin } from '../abstract-aliyun.js'
import Core from '@alicloud/pop-core'
import { K8sClient } from '@certd/plugin-common'
const ROAClient = Core.ROAClient

const define = {
  name: 'deployCertToAliyunAckIngress',
  label: '部署到阿里云AckIngress',
  input: {
    clusterId: {
      label: '集群id',
      component: {
        placeholder: '集群id'
      },
      required: true
    },
    secretName: {
      label: '保密字典Id',
      component: {
        placeholder: '保密字典Id'
      },
      required: true
    },
    regionId: {
      label: '大区',
      value: 'cn-shanghai',
      component: {
        placeholder: '集群所属大区'
      },
      required: true
    },
    namespace: {
      label: '命名空间',
      value: 'default',
      component: {
        placeholder: '命名空间'
      },
      required: true
    },
    ingressName: {
      label: 'ingress名称',
      value: '',
      component: {
        placeholder: 'ingress名称'
      },
      required: true,
      helper: '可以传入一个数组'
    },
    ingressClass: {
      label: 'ingress类型',
      value: 'nginx',
      component: {
        placeholder: '暂时只支持nginx类型'
      },
      required: true
    },
    isPrivateIpAddress: {
      label: '是否私网ip',
      value: false,
      component: {
        placeholder: '集群连接端点是否是私网ip'
      },
      helper: '如果您当前certd运行在同一个私网下，可以选择是。',
      required: true
    },
    accessProvider: {
      label: 'Access提供者',
      type: [String, Object],
      desc: 'access授权',
      component: {
        name: 'access-provider-selector',
        filter: 'aliyun'
      },
      required: true
    }
  },
  output: {

  }
}

export class DeployCertToAliyunAckIngress extends AbstractAliyunPlugin {
  static define () {
    return define
  }

  async execute ({ cert, props, context }) {
    const accessProvider = this.getAccessProvider(props.accessProvider)
    const client = this.getClient(accessProvider, props.regionId)

    const kubeConfigStr = await this.getKubeConfig(client, props.clusterId, props.isPrivateIpAddress)

    this.logger.info('kubeconfig已成功获取')
    const k8sClient = new K8sClient(kubeConfigStr)
    const ingressType = props.ingressClass || 'qcloud'
    if (ingressType === 'qcloud') {
      throw new Error('暂未实现')
      // await this.patchQcloudCertSecret({ k8sClient, props, context })
    } else {
      await this.patchNginxCertSecret({ cert, k8sClient, props, context })
    }

    await this.sleep(3000) // 停留2秒，等待secret部署完成
    // await this.restartIngress({ k8sClient, props })
    return true
  }

  async restartIngress ({ k8sClient, props }) {
    const { namespace } = props

    const body = {
      metadata: {
        labels: {
          certd: this.appendTimeSuffix('certd')
        }
      }
    }
    const ingressList = await k8sClient.getIngressList({ namespace })
    console.log('ingressList:', ingressList)
    if (!ingressList || !ingressList.body || !ingressList.body.items) {
      return
    }
    const ingressNames = ingressList.body.items.filter(item => {
      if (!item.spec.tls) {
        return false
      }
      for (const tls of item.spec.tls) {
        if (tls.secretName === props.secretName) {
          return true
        }
      }
      return false
    }).map(item => {
      return item.metadata.name
    })
    for (const ingress of ingressNames) {
      await k8sClient.patchIngress({ namespace, ingressName: ingress, body })
      this.logger.info(`ingress已重启:${ingress}`)
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

  getClient (aliyunProvider, regionId) {
    return new ROAClient({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: `https://cs.${regionId}.aliyuncs.com`,
      apiVersion: '2015-12-15'
    })
  }

  async getKubeConfig (client, clusterId, isPrivateIpAddress = false) {
    const httpMethod = 'GET'
    const uriPath = `/k8s/${clusterId}/user_config`
    const queries = {
      PrivateIpAddress: isPrivateIpAddress
    }
    const body = '{}'
    const headers = {
      'Content-Type': 'application/json'
    }
    const requestOption = {}

    try {
      const res = await client.request(httpMethod, uriPath, queries, body, headers, requestOption)
      return res.config
    } catch (e) {
      console.error('请求出错：', e)
      throw e
    }
  }
}
