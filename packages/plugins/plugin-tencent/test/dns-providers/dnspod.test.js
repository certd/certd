import pkg from 'chai'
import { DnspodDnsProvider } from '../../src/dns-providers/dnspod.js'
import { createOptions, getDnsProviderOptions } from '../../../../../test/options.js'
const { expect } = pkg
describe('DnspodDnsProvider', function () {
  it('#getDomainList', async function () {
    let options = createOptions()
    options.cert.dnsProvider = {
      type: 'dnspod',
      accessProvider: 'dnspod'
    }
    options = getDnsProviderOptions(options)

    const dnsProvider = new DnspodDnsProvider(options)
    const domainList = await dnsProvider.getDomainList()
    console.log('domainList', domainList)
    expect(domainList.length).gt(0)
  })

  it('#createRecord&removeRecord', async function () {
    let options = createOptions()
    options.cert.dnsProvider = {
      type: 'dnspod',
      accessProvider: 'dnspod'
    }
    options = getDnsProviderOptions(options)

    const dnsProvider = new DnspodDnsProvider(options)
    const record = await dnsProvider.createRecord({ fullRecord: '___certd___.__test__.certd.xyz', type: 'TXT', value: 'aaaa' })
    console.log('recordId', record.id)
    expect(record.id != null).ok

    await dnsProvider.removeRecord({ fullRecord: '___certd___.__test__.certd.xyz', type: 'TXT', value: 'aaaa', record })
  })
})
