import pkg from 'chai'
import DnspodDnsProvider from '../../src/providers/dnspod.js'
import { Certd } from '../../src/index.js'
import { createOptions } from '../../../../test/options.js'
const { expect } = pkg
describe('DnspodDnsProvider', function () {
  it('#getDomainList', async function () {
    const options = createOptions()
    const dnsProvider = new DnspodDnsProvider(options.accessProviders.dnspod)
    const domainList = await dnsProvider.getDomainList()
    console.log('domainList', domainList)
    expect(domainList.length).gt(0)
  })

  it('#createRecord&removeRecord', async function () {
    const options = createOptions()
    const dnsProvider = new DnspodDnsProvider(options.accessProviders.dnspod)
    const record = await dnsProvider.createRecord({ fullRecord: '___certd___.__test__.certd.xyz', type: 'TXT', value: 'aaaa' })
    console.log('recordId', record.id)
    expect(record.id != null).ok

    await dnsProvider.removeRecord({ fullRecord: '___certd___.__test__.certd.xyz', type: 'TXT', value: 'aaaa', record })
  })
})
