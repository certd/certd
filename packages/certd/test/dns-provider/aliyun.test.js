import pkg from 'chai'
import options from '../options.js'
import AliyunDnsProvider from '../../src/dns-provider/impl/aliyun.js'
const { expect } = pkg
describe('AliyunDnsProvider', function () {
  it('#getDomainList', async function () {
    const aliyunDnsProvider = new AliyunDnsProvider(options.providers.aliyun)
    const domainList = await aliyunDnsProvider.getDomainList()
    console.log('domainList', domainList)
    expect(domainList.length).gt(0)
  })

  it('#getRecords', async function () {
    const aliyunDnsProvider = new AliyunDnsProvider(options.providers.aliyun)
    const recordList = await aliyunDnsProvider.getRecords('docmirror.cn', '*')
    console.log('recordList', recordList)
    expect(recordList.length).gt(0)
  })

  it('#createRecord', async function () {
    const aliyunDnsProvider = new AliyunDnsProvider(options.providers.aliyun)
    const recordId = await aliyunDnsProvider.createRecord('___certd___.__test__.docmirror.cn', 'TXT', 'aaaa')
    console.log('recordId', recordId)
    expect(recordId != null).ok
  })

  it('#removeRecord', async function () {
    const aliyunDnsProvider = new AliyunDnsProvider(options.providers.aliyun)
    const recordId = await aliyunDnsProvider.removeRecord('___certd___.__test__.docmirror.cn', 'TXT', 'aaaa')
    console.log('recordId', recordId)
    expect(recordId != null).ok
  })
})
