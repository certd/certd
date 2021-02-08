import pkg from 'chai'
import { DeployCertToTencentTKEIngress } from '../../src/plugins/deploy-to-tke-ingress/index.js'
import { Certd } from '@certd/certd'
import { createOptions } from '../../../../../test/options.js'
import { K8sClient } from '../../src/utils/util.k8s.client.js'

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
      accessProvider: 'tencent-yonsz',
      region: 'ap-guangzhou',
      clusterId: 'cls-6lbj1vee'
    },
    context
  }
  return { options, deployOpts }
}

describe('DeployCertToTencentTKEIngress', function () {
  it('#getTKESecrets', async function () {
    this.timeout(50000)
    const { options, deployOpts } = await getOptions()
    const plugin = new DeployCertToTencentTKEIngress(options)
    const tkeClient = plugin.getTkeClient(options.accessProviders[deployOpts.props.accessProvider], deployOpts.props.region)
    const kubeConfig = await plugin.getTkeKubeConfig(tkeClient, deployOpts.props.clusterId)

    const k8sClient = new K8sClient(kubeConfig)
    k8sClient.setLookup({
      'cls-6lbj1vee.ccs.tencent-cloud.com': { ip: '13.123.123.123' }
    })
    const secrets = await k8sClient.getSecret({ namespace: 'default' })

    console.log('secrets:', secrets)
  })
  it('#execute', async function () {
    this.timeout(5000)
    const { options, deployOpts } = await getOptions()
    deployOpts.props.ingressName = 'ingress-base'
    deployOpts.props.secretName = 'cert---docmirror-cn'
    deployOpts.context.tencentCertId = 'hNUZJrZf'
    const plugin = new DeployCertToTencentTKEIngress(options)

    const ret = await plugin.doExecute(deployOpts)
    console.log('sucess', ret)
  })
})
