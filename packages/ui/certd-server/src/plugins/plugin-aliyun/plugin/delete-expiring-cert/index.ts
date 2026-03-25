import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import dayjs from 'dayjs';
import { AliyunAccess } from '../../../plugin-lib/aliyun/access/index.js';
import { AliyunSslClient } from '../../../plugin-lib/aliyun/lib/index.js';

@IsTaskPlugin({
  name: 'AliyunDeleteExpiringCert',
  title: '阿里云-删除即将过期证书',
  icon: 'ant-design:aliyun-outlined',
  group: pluginGroups.aliyun.key,
  desc: '仅删除未使用的证书',
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: true,
})
export class AliyunDeleteExpiringCert extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: 'Access提供者',
    helper: 'access 授权',
    component: {
      name: 'access-selector',
      type: 'aliyun',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '地域',
    helper: '阿里云CAS证书服务地域',
    component: {
      name: 'a-select',
      options: [
        { value: 'cas.aliyuncs.com', label: '中国大陆' },
        { value: 'cas.ap-southeast-1.aliyuncs.com', label: '新加坡' },
      ],
    },
    required: true,
    value: 'cas.aliyuncs.com',
  })
  endpoint!: string;

  // @TaskInput({
  //   title: '关键字筛选',
  //   helper: '仅匹配证书名称、域名包含关键字的证书，可以不填',
  //   required: false,
  //   component: {
  //     name: 'a-input',
  //   },
  // })
  // searchKey!: string;

  @TaskInput({
    title: '最大删除数量',
    helper: '单次运行最大删除数量',
    value: 100,
    component: {
      name: 'a-input-number',
      vModel: 'value',
    },
    required: true,
  })
  maxCount!: number;

  @TaskInput({
    title: '即将过期天数',
    helper: '仅删除有效期小于此天数的证书,0表示完全过期时才删除',
    value: 0,
    component: {
      name: 'a-input-number',
      vModel: 'value',
    },
    required: true,
  })
  expiringDays!: number;

  @TaskInput({
    title: '检查超时时间',
    helper: '检查删除任务结果超时时间,单位分钟',
    value: 10,
    component: {
      name: 'a-input-number',
      vModel: 'value',
    },
    required: true,
  })
  checkTimeout!: number;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint,
    });

    const params = {
      ShowSize: 100,
      CurrentPage: 1,
      // Keyword: this.searchKey,
    };
    const certificates: any[] = [];
    while(true){
      const res = await sslClient.doRequest('ListCertificates', params, {
          method: 'POST',
        });
      let list = res?.CertificateList;
      if (!list || list.length === 0) {
        break;
      }
      this.logger.info(`查询第${params.CurrentPage}页，每页${params.ShowSize}个证书，当前页共${list.length}个证书`);

      const lastDay = dayjs().add(this.expiringDays, 'day');
      list = list.filter((item: any) => {
        const notAfter = item.NotAfter;
        const usingProducts = item.UsingProductList;
        return dayjs(notAfter).isBefore(lastDay) && (!usingProducts || usingProducts.length === 0);
      });
      for (const item of list) {
        this.logger.info(`证书ID:${item.CertificateId}, 过期时间:${item.NotAfter}，名称:${item.CertificateName}，证书域名:${item.Domain}`);
        certificates.push(item);
      }
      params.CurrentPage++;
    }

    this.logger.info(`即将过期的证书数量:${certificates.length}`);
    if (certificates.length === 0) {
      this.logger.info('没有即将过期的证书, 无需删除');
      return;
    }
    this.logger.info(`开始删除证书，共${certificates.length}个证书`);
    let successCount = 0;
    let failedCount = 0;

    for (const certificate of certificates) {
      try {
        const deleteRes = await sslClient.doRequest('DeleteUserCertificate', {
          CertId: certificate.CertificateId,
        }, { method: 'POST' });
        this.logger.info(`删除证书成功，证书ID:${certificate.CertificateId}, 名称:${certificate.CertificateName}, requestId:${deleteRes?.RequestId}`);
        successCount++;

      } catch (error: any) {
        this.logger.error(`删除证书失败，证书ID:${certificate.CertificateId}, 名称:${certificate.CertificateName}, 错误:${error.message}`);
        failedCount++;
      }
    }

    this.logger.info(`证书删除完成，成功:${successCount}, 失败:${failedCount}`);
  }
}

new AliyunDeleteExpiringCert();