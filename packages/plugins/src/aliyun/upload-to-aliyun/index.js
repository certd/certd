import Core from '@alicloud/pop-core'
import dayjs from 'dayjs'
import { AbstractAliyunPlugin } from '../abstract-aliyun.js'
export class UploadCertToAliyun extends AbstractAliyunPlugin {
  /**
   * 插件定义
   * 名称
   * 入参
   * 出参
   */
  static define () {
    return {
      name: 'uploadCertToAliyun',
      label: '上传证书到阿里云',
      input: {
        name: {
          label: '证书名称'
        },
        regionId: {
          label: '大区',
          value: 'cn-hangzhou'
        },
        accessProvider: {
          label: 'Access提供者',
          type: [String, Object],
          desc: 'AccessProviders的key 或 一个包含accessKeyId与accessKeySecret的对象',
          options: 'accessProviders[type=aliyun]'
        }
      },
      output: {
        aliyunCertId: {
          type: String,
          desc: '上传成功后的阿里云CertId'
        }
      }
    }
  }

  getClient (aliyunProvider) {
    return new Core({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: 'https://cas.aliyuncs.com',
      apiVersion: '2018-07-13'
    })
  }

  async execute ({ accessProviders, cert, props, context }) {
    const { name, accessProvider } = props
    const certName = this.appendTimeSuffix(name || cert.domain)
    const params = {
      RegionId: props.regionId || 'cn-hangzhou',
      Name: certName,
      Cert: this.format(cert.crt.toString()),
      Key: this.format(cert.key.toString())
    }

    const requestOption = {
      method: 'POST'
    }

    const provider = super.getAccessProvider(accessProvider, accessProviders)
    const client = this.getClient(provider)
    const ret = await client.request('CreateUserCertificate', params, requestOption)
    this.checkRet(ret)
    this.logger.info('证书上传成功：aliyunCertId=', ret.CertId)
    context.aliyunCertId = ret.CertId
  }

  /**
   * 没用，现在阿里云证书不允许删除
   * @param accessProviders
   * @param cert
   * @param props
   * @param context
   * @returns {Promise<void>}
   */
  async rollback ({ accessProviders, cert, props, context }) {
    const { accessProvider } = props
    const { aliyunCertId } = context
    this.logger.info('准备删除阿里云证书:', aliyunCertId)
    const params = {
      RegionId: props.regionId || 'cn-hangzhou',
      CertId: aliyunCertId
    }

    const requestOption = {
      method: 'POST'
    }

    const provider = super.getAccessProvider(accessProvider, accessProviders)
    const client = this.getClient(provider)
    const ret = await client.request('DeleteUserCertificate', params, requestOption)
    this.checkRet(ret)
    this.logger.info('证书删除成功:', aliyunCertId)
    delete context.aliyunCertId
  }
}
