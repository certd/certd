import pkg from 'chai'
import { DeployCertToAliyunAckIngress } from '../../src/plugins/deploy-to-ack-ingress/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../../test/options.js'
import { K8sClient } from '@certd/plugin-common'

const { expect } = pkg

async function getOptions () {
  const options = createOptions()
  options.args.test = false
  options.cert.email = 'xiaojunnuo@qq.com'
  options.cert.domains = ['*.docmirror.cn']
  const certd = new Certd(options)
  const cert = await certd.readCurrentCert()
  const context = {}
  const deployOpts = {
    accessProviders: options.accessProviders,
    cert,
    props: {
      accessProvider: 'aliyun-yonsz-prod',
      regionId: 'cn-shanghai',
      clusterId: 'c9e107ca518314f70973636965037fc00',
      secretName: 'default-ingress-secret1638601684896',
      namespace: 'default',
      ingressClass: 'nginx'
    },
    context
  }
  return { options, deployOpts }
}

describe('DeployCertToAliyunAckIngressNginx', function () {
  it('#getAliyunSecrets', async function () {
    this.timeout(50000)
    const { options, deployOpts } = await getOptions()
    const plugin = new DeployCertToAliyunAckIngress(options)
    const ackClient = plugin.getClient(options.accessProviders[deployOpts.props.accessProvider], deployOpts.props.regionId)
    const kubeConfig = await plugin.getKubeConfig(ackClient, deployOpts.props.clusterId, false)

    const k8sClient = new K8sClient(kubeConfig)
    const secrets = await k8sClient.getSecret({ namespace: 'default' })

    console.log('secrets:', secrets)
  })
  it('#getAliyunIngreses', async function () {
    this.timeout(50000)
    const { options, deployOpts } = await getOptions()
    const plugin = new DeployCertToAliyunAckIngress(options)
    const ackClient = plugin.getClient(options.accessProviders[deployOpts.props.accessProvider], deployOpts.props.regionId)
    const kubeConfig = await plugin.getKubeConfig(ackClient, deployOpts.props.clusterId, false)

    const k8sClient = new K8sClient(kubeConfig)
    const list = await k8sClient.getIngressList({ namespace: 'default' })

    console.log('list:', list)
  })
  it('#execute', async function () {
    this.timeout(5000)

    const { options, deployOpts } = await getOptions()
    const plugin = new DeployCertToAliyunAckIngress(options)

    const ret = await plugin.doExecute(deployOpts)
    console.log('success', ret)
  })
})
