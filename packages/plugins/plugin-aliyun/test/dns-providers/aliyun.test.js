import pkg from 'chai'
import { AliyunDnsProvider } from '../../src/dns-providers/aliyun.js'
import { createOptions } from '../../../../../test/options.js'
const { expect } = pkg

export function getPluginOptions () {
  const options = createOptions()
  return { accessProviders: options.accessProviders, props: options.cert.dnsProvider }
}

describe('AliyunDnsProvider', function () {
  it('#getDomainList', async function () {
    const options = getPluginOptions()
    const aliyunDnsProvider = new AliyunDnsProvider(options)
    const domainList = await aliyunDnsProvider.getDomainList()
    console.log('domainList', domainList)
    expect(domainList.length).gt(0)
  })

  it('#getRecords', async function () {
    const options = getPluginOptions()
    const aliyunDnsProvider = new AliyunDnsProvider(options)
    const recordList = await aliyunDnsProvider.getRecords('docmirror.cn', '*')
    console.log('recordList', recordList)
    expect(recordList.length).gt(0)
  })

  it('#createAndRemoveRecord', async function () {
    const options = getPluginOptions()
    const aliyunDnsProvider = new AliyunDnsProvider(options)
    const record = await aliyunDnsProvider.createRecord({ fullRecord: '___certd___.__test__.docmirror.cn', type: 'TXT', value: 'aaaa' })
    console.log('recordId', record)
    expect(record != null).ok

    const recordId = await aliyunDnsProvider.removeRecord({ fullRecord: '___certd___.__test__.docmirror.cn', type: 'TXT', value: 'aaaa', record })
    console.log('recordId', recordId)
    expect(recordId != null).ok
  })
})
