import chai from 'chai'
import { Certd } from '../src/index.js'
import { createOptions } from '../../../test/options.js'
const { expect } = chai
const fakeCrt = `-----BEGIN CERTIFICATE-----
MIIFNTCCBB2gAwIBAgITAPpZZ0r22X9e/yCu3/DPCqYZUTANBgkqhkiG9w0BAQsF
ADAiMSAwHgYDVQQDDBdGYWtlIExFIEludGVybWVkaWF0ZSBYMTAeFw0yMDEyMTMw
OTI5NTFaFw0yMTAzMTMwOTI5NTFaMBkxFzAVBgNVBAMMDiouZG9jbWlycm9yLmNu
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7ejWwrYC0Z7dbYJgT87I
cZ9ymvxS3OI5OymhE4IscZIWPJTJ/AklZhzUDY61kC2CM+ixWNF8/w17Z2yRdhkV
PmAuNzn47kCHi3voaq5Gb16jYHB160ak6Reds/o4V8Kypwgifx4GjMGDYCRHD9Rg
YD/WaTN68Ir337WPdhRBJYBKOVhjmiAOuIvyHz+oOhbB+9kOb+Fg9LYGHlxeE2lC
ADuU3YstHbSfHS+U11BDcOXXlhpnX2EkNQntzr6QgEvWOahB8h9nKDeF2lQCe019
UyNyZtiKgWajGzHdWT6e2XppWljtEDQsyMCncDQUOcFU3isCp0+YgcpIZi0r98m7
fQIDAQABo4ICazCCAmcwDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUF
BwMBBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBSlRx7ZafevdHLp
XoM14DoCiNtdRTAfBgNVHSMEGDAWgBTAzANGuVggzFxycPPhLssgpvVoOjB3Bggr
BgEFBQcBAQRrMGkwMgYIKwYBBQUHMAGGJmh0dHA6Ly9vY3NwLnN0Zy1pbnQteDEu
bGV0c2VuY3J5cHQub3JnMDMGCCsGAQUFBzAChidodHRwOi8vY2VydC5zdGctaW50
LXgxLmxldHNlbmNyeXB0Lm9yZy8wGQYDVR0RBBIwEIIOKi5kb2NtaXJyb3IuY24w
TAYDVR0gBEUwQzAIBgZngQwBAgEwNwYLKwYBBAGC3xMBAQEwKDAmBggrBgEFBQcC
ARYaaHR0cDovL2Nwcy5sZXRzZW5jcnlwdC5vcmcwggEEBgorBgEEAdZ5AgQCBIH1
BIHyAPAAdgAD7fHal3a284w0HjntnXB6dXA2nPmETzJ/6eFBODYbYAAAAXZbpkHw
AAAEAwBHMEUCIQDAsD0yStiWkCh0pop21/o+3nc56Mz7XIvBMvKXgGR6BgIgKDUN
+auptABhgABECoGpHdv5jVcs1MwJrySV81O0w5MAdgCwzIPlpfl9a698CcwoSQSH
KsfoixMsY1C3xv0m4WxsdwAAAXZbpkH6AAAEAwBHMEUCIQDenPpUWTbnxO45ISpC
6kZo9xfqS5yEYM4VfOtf46iI7gIgNLT8bZnf6jcfwiS0AC9mfrV5nZgfCF4fgu5J
z+7GRV8wDQYJKoZIhvcNAQELBQADggEBAOuOY+C3ugzfAHc8PX3a+6MrWJi3s4bg
DNg1ViY5R6n+F1nonUaHsThHZglDfwWgxOstxzzLU9f/jLOnVmeMz96vnxefW4+f
jgXeYRupja94VufAjIdFOJIEjCLwH/Zs8PpMUcxSf58J6dScMVmptenrsQWyRkEA
CEsZKQnjL00F5QlIls+yczYoToD6Pt9hGhJ9NG2rWMwcbflXW8l7E8eQPegYFYw3
EB1qffDdoJsGId4BwoRNt1N1uHl63ZFFMLmVV+SWXUrwf3Zpj5nxzk3d3bvh9k43
GbIyf5y6M6DOiUymEY8izoozC/aVb32Z860d5pRGjkRNLD8jKuupd7I=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEqzCCApOgAwIBAgIRAIvhKg5ZRO08VGQx8JdhT+UwDQYJKoZIhvcNAQELBQAw
GjEYMBYGA1UEAwwPRmFrZSBMRSBSb290IFgxMB4XDTE2MDUyMzIyMDc1OVoXDTM2
MDUyMzIyMDc1OVowIjEgMB4GA1UEAwwXRmFrZSBMRSBJbnRlcm1lZGlhdGUgWDEw
ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDtWKySDn7rWZc5ggjz3ZB0
8jO4xti3uzINfD5sQ7Lj7hzetUT+wQob+iXSZkhnvx+IvdbXF5/yt8aWPpUKnPym
oLxsYiI5gQBLxNDzIec0OIaflWqAr29m7J8+NNtApEN8nZFnf3bhehZW7AxmS1m0
ZnSsdHw0Fw+bgixPg2MQ9k9oefFeqa+7Kqdlz5bbrUYV2volxhDFtnI4Mh8BiWCN
xDH1Hizq+GKCcHsinDZWurCqder/afJBnQs+SBSL6MVApHt+d35zjBD92fO2Je56
dhMfzCgOKXeJ340WhW3TjD1zqLZXeaCyUNRnfOmWZV8nEhtHOFbUCU7r/KkjMZO9
AgMBAAGjgeMwgeAwDgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAw
HQYDVR0OBBYEFMDMA0a5WCDMXHJw8+EuyyCm9Wg6MHoGCCsGAQUFBwEBBG4wbDA0
BggrBgEFBQcwAYYoaHR0cDovL29jc3Auc3RnLXJvb3QteDEubGV0c2VuY3J5cHQu
b3JnLzA0BggrBgEFBQcwAoYoaHR0cDovL2NlcnQuc3RnLXJvb3QteDEubGV0c2Vu
Y3J5cHQub3JnLzAfBgNVHSMEGDAWgBTBJnSkikSg5vogKNhcI5pFiBh54DANBgkq
hkiG9w0BAQsFAAOCAgEABYSu4Il+fI0MYU42OTmEj+1HqQ5DvyAeyCA6sGuZdwjF
UGeVOv3NnLyfofuUOjEbY5irFCDtnv+0ckukUZN9lz4Q2YjWGUpW4TTu3ieTsaC9
AFvCSgNHJyWSVtWvB5XDxsqawl1KzHzzwr132bF2rtGtazSqVqK9E07sGHMCf+zp
DQVDVVGtqZPHwX3KqUtefE621b8RI6VCl4oD30Olf8pjuzG4JKBFRFclzLRjo/h7
IkkfjZ8wDa7faOjVXx6n+eUQ29cIMCzr8/rNWHS9pYGGQKJiY2xmVC9h12H99Xyf
zWE9vb5zKP3MVG6neX1hSdo7PEAb9fqRhHkqVsqUvJlIRmvXvVKTwNCP3eCjRCCI
PTAvjV+4ni786iXwwFYNz8l3PmPLCyQXWGohnJ8iBm+5nk7O2ynaPVW0U2W+pt2w
SVuvdDM5zGv2f9ltNWUiYZHJ1mmO97jSY/6YfdOUH66iRtQtDkHBRdkNBsMbD+Em
2TgBldtHNSJBfB3pm9FblgOcJ0FSWcUDWJ7vO0+NTXlgrRofRT6pVywzxVo6dND0
WzYlTWeUVsO40xJqhgUQRER9YLOLxJ0O6C8i0xFxAMKOtSdodMB3RIwt7RFQ0uyt
n5Z5MqkYhlMI3J1tPRTp1nEt9fyGspBOO05gi148Qasp+3N+svqKomoQglNoAxU=
-----END CERTIFICATE-----`
describe('Certd', function () {
  it('#buildCertDir', function () {
    const options = createOptions()
    options.cert.domains = ['*.docmirror.club']
    const certd = new Certd(options)
    const rootDir = certd.buildCertDir('xiaojunnuo@qq.com', options.cert.domains)
    console.log('rootDir', rootDir)
    expect(rootDir).match(/xiaojunnuo@qq.com\\certs\\_.docmirror.club/)
  })
  it('#writeAndReadCert', async function () {
    const options = createOptions()
    const certd = new Certd(options)
    certd.writeCert('xiaojunnuo@qq.com', ['*.domain.cn'], { csr: 'csr', crt: fakeCrt, key: 'bbb' })

    const cert = certd.readCurrentCert('xiaojunnuo@qq.com', ['*.domain.cn'])
    expect(cert).to.be.ok
    expect(cert.crt).ok
    expect(cert.key).to.be.ok
    expect(cert.detail).to.be.ok
    expect(cert.expires).to.be.ok
    console.log('expires:', cert.expires)
  })
})
