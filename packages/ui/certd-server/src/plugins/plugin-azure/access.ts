import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';
import { DomainRecord } from '@certd/plugin-cert';
import { utils } from '@certd/basic';
import { PageRes, PageSearch } from '@certd/pipeline';

@IsAccess({
  name: 'azure',
  title: '微软云Azure授权',
  desc: '',
  icon: 'simple-icons:microsoftazure',
})
export class AzureAccess extends BaseAccess {
  @AccessInput({
    title: '订阅 ID',
    component: {
      placeholder: 'subscriptionId',
    },
    helper: 'Azure 订阅 ID',
    required: true,
  })
  subscriptionId = '';


  @AccessInput({
    title: '资源组',
    component: {
      placeholder: 'resourceGroupName',
    },
    helper: 'DNS 区域所在的资源组名称',
    required: true,
  })
  resourceGroupName = '';

  @AccessInput({
    title: '目录(租户) ID',
    component: {
      placeholder: 'tenantId',
    },
    helper: '目录(租户) ID',
    required: true,
  })
  tenantId = '';

  @AccessInput({
    title: '应用程序ID',
    component: {
      placeholder: 'clientId',
    },
    helper: '应用程序(客户端) ID',
    required: true,
  })
  clientId = '';

  @AccessInput({
    title: '客户端凭据',
    component: {
      placeholder: 'clientSecret',
    },
    required: true,
    encrypt: true,
    helper: '客户端凭据(机密)->客户端密码->新客户端密码->时间选长一点的->复制值',
  })
  clientSecret = '';



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "测试授权是否正确"
  })
  testRequest = true;

  async onTestRequest() {
    this.ctx.logger.info('开始测试 Azure 认证...');
    
    // 1. 先测试身份认证，获取访问令牌
    const { ClientSecretCredential } = await import('@azure/identity');
    
    const credential = new ClientSecretCredential(
      this.tenantId,
      this.clientId,
      this.clientSecret
    );
    
    // 获取 Azure 管理 API 的访问令牌来验证凭据
    this.ctx.logger.info('验证身份凭据...');
    const token = await credential.getToken('https://management.azure.com/.default');
    this.ctx.logger.info('身份认证成功！', token);
    
    return "ok";
  }

  async getDnsManagementClient() {
    const { DnsManagementClient } = await import('@azure/arm-dns');
    const { ClientSecretCredential } = await import('@azure/identity');

    const credential = new ClientSecretCredential(
      this.tenantId,
      this.clientId,
      this.clientSecret
    );

    return new DnsManagementClient(credential, this.subscriptionId);
  }

  async listZones(): Promise<any[]> {
    const client = await this.getDnsManagementClient();
    const zones: any[] = [];

    for await (const zone of client.zones.listByResourceGroup(this.resourceGroupName)) {
      zones.push(zone);
    }

    return zones;
  }

  async getZoneId(domain: string): Promise<{ id: string; name: string }> {
    const zones = await this.listZones();
    const domainSuffix = domain.endsWith('.') ? domain : domain + '.';

    const matchingZone = zones.find((zone: any) => {
      const zoneName = zone.name.endsWith('.') ? zone.name : zone.name + '.';
      return domainSuffix.endsWith(zoneName) || domainSuffix === zoneName;
    });

    if (!matchingZone) {
      throw new Error(`找不到匹配的 DNS 区域: ${domain}`);
    }

    this.ctx.logger.info(`找到 DNS 区域: ${matchingZone.name}, ID: ${matchingZone.id}`);
    return {
      id: matchingZone.id.split('/').pop()!,
      name: matchingZone.name,
    };
  }

  async listZonesPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const zones = await this.listZones();
    let list = zones;

    if (req.searchKey) {
      list = list.filter((zone: any) => zone.name.includes(req.searchKey));
    }

    list = list.map((item: any) => ({
      id: item.id.split('/').pop()!,
      domain: item.name,
    }));

    return {
      total: list.length,
      list,
    };
  }


  async createOrUpdateRecordSet(zoneName: string, recordType: string, relativeRecordSetName: string, value: string) {
    const client = await this.getDnsManagementClient();

    this.ctx.logger.info(`创建/更新记录集: ${relativeRecordSetName}.${zoneName}, 类型: ${recordType}, 值: ${value}`);

    // 获取现有记录集
    let existingRecordSet: any = null;
    try {
      existingRecordSet = await client.recordSets.get(
        this.resourceGroupName,
        zoneName,
        relativeRecordSetName,
        recordType as any
      );
    } catch (e) {
      // 记录集不存在，这是正常的
    }

    let txtRecords: any[] = [];
    if (existingRecordSet && existingRecordSet.txtRecords) {
      txtRecords = [...existingRecordSet.txtRecords];
      // 检查是否已存在相同的记录，避免重复
      const exists = txtRecords.some(r => r.value && r.value.includes(value));
      if (exists) {
        this.ctx.logger.info(`记录值已存在，无需重复添加: ${value}`);
        return existingRecordSet;
      }
    }

    // 添加新记录
    txtRecords.push({
      value: [value]
    });

    const recordSet = await client.recordSets.createOrUpdate(
      this.resourceGroupName,
      zoneName,
      relativeRecordSetName,
      recordType as any,
      {
        ttl: 60,
        txtRecords: txtRecords
      }
    );

    await utils.sleep(3000);
    return recordSet;
  }

  async deleteRecordSet(zoneName: string, recordType: string, relativeRecordSetName: string, value: string) {
    const client = await this.getDnsManagementClient();

    this.ctx.logger.info(`删除记录值: ${relativeRecordSetName}.${zoneName}, 类型: ${recordType}, 值: ${value}`);

    try {
      // 获取现有记录集
      const existingRecordSet = await client.recordSets.get(
        this.resourceGroupName,
        zoneName,
        relativeRecordSetName,
        recordType as any
      );

      if (!existingRecordSet.txtRecords || existingRecordSet.txtRecords.length === 0) {
        this.ctx.logger.info('记录集不存在或已为空，无需删除');
        return;
      }

      // 过滤掉我们要删除的那个值
      const filteredTxtRecords = existingRecordSet.txtRecords.filter((r: any) => {
        return !(r.value && r.value.includes(value));
      });

      if (filteredTxtRecords.length === existingRecordSet.txtRecords.length) {
        this.ctx.logger.info(`未找到要删除的记录值: ${value}`);
        return;
      }

      if (filteredTxtRecords.length === 0) {
        // 如果没有记录了，就删除整个记录集
        this.ctx.logger.info('删除空记录集');
        await client.recordSets.delete(
          this.resourceGroupName,
          zoneName,
          relativeRecordSetName,
          recordType as any
        );
      } else {
        // 还有其他记录，只更新记录集，移除我们的值
        this.ctx.logger.info(`更新记录集，移除指定值，剩余 ${filteredTxtRecords.length} 条记录`);
        await client.recordSets.createOrUpdate(
          this.resourceGroupName,
          zoneName,
          relativeRecordSetName,
          recordType as any,
          {
            ttl: existingRecordSet.ttl,
            txtRecords: filteredTxtRecords
          }
        );
      }
    } catch (e: any) {
      this.ctx.logger.warn(`删除记录时出错: ${e.message}`);
    }
  }
}

new AzureAccess();
