import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { TencentAccess } from "../../../plugin-lib/tencent/access.js";

@IsTaskPlugin({
  name: 'TencentActionInstancesPlugin',
  title: '腾讯云-实例开关机',
  icon: 'svg:icon-tencentcloud',
  group: pluginGroups.tencent.key,
  desc: '腾讯云实例开关机',
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: false,
})
export class TencentActionInstancesPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: 'Access提供者',
    helper: 'access 授权',
    component: {
      name: 'access-selector',
      type: 'tencent',
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: '所在地域',
    helper: '实例所在地域',
    component: {
      name: 'a-auto-complete',
      vModel: 'value',
      options: [
        { value: '', label: '--------中国大陆地区-------', disabled: true },
        { value: 'ap-beijing-1', label: '北京1区' },
        { value: 'ap-beijing', label: '北京' },
        { value: 'ap-nanjing', label: '南京' },
        { value: 'ap-shanghai', label: '上海' },
        { value: 'ap-guangzhou', label: '广州' },
        { value: 'ap-chengdu', label: '成都' },
        { value: 'ap-chongqing', label: '重庆' },
        { value: 'ap-shenzhen-fsi', label: '深圳金融' },
        { value: 'ap-shanghai-fsi', label: '上海金融' },
        { value: 'ap-beijing-fsi', label: '北京金融' },
        { value: '', label: '--------中国香港及境外-------', disabled: true },
        { value: 'ap-hongkong', label: '中国香港' },
        { value: 'ap-singapore', label: '新加坡' },
        { value: 'ap-mumbai', label: '孟买' },
        { value: 'ap-jakarta', label: '雅加达' },
        { value: 'ap-seoul', label: '首尔' },
        { value: 'ap-bangkok', label: '曼谷' },
        { value: 'ap-tokyo', label: '东京' },
        { value: 'na-siliconvalley', label: '硅谷' },
        { value: 'na-ashburn', label: '弗吉尼亚' },
        { value: 'sa-saopaulo', label: '圣保罗' },
        { value: 'eu-frankfurt', label: '法兰克福' },
      ],
    },
    required: true,
  })
  region!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: '实列ID',
      helper: '请选择实列',
      typeName: 'TencentStartInstancesPlugin',
      action: TencentActionInstancesPlugin.prototype.onGetInstanceList.name,
      watches: ['region'],
    })
  )
  instanceId!: string[];

  @TaskInput({
    title: '操作',
    component: {
      name: 'a-radio-group',
      vModel: 'value',
      options: [
        { value: 'start', label: '开机' },
        { value: 'stop', label: '关机' },
      ],
    },
    required: true,
  })
  action!: string;

  @TaskInput({
    title: '实例关机不收费',
    value: true,
    component: {
      name: 'a-switch',
      vModel: 'checked',
      placeholder: `按量计费实例关机不收费`,
    },
    required: false,
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.action === 'stop';
        })
      }
  `,
  })
  charging = true;

  async onInstance() {}

  async execute(): Promise<void> {
    const cvmClient = await this.getCvmClient();
    const params = {
      InstanceIds: this.instanceId,
    };
    let res: any;
    if (this.action === 'start') {
      res = await cvmClient.StartInstances(params);
    } else {
      res = await cvmClient.StopInstances(
        Object.assign(params, {
          StopType: 'SOFT_FIRST',
          StoppedMode: this.charging ? 'STOP_CHARGING' : 'KEEP_CHARGING',
        })
      );
    }

    this.checkRet(res);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error('执行失败：' + ret.Error.Code + ',' + ret.Error.Message);
    }
  }

  async getCvmClient() {
    const accessProvider = await this.getAccess<TencentAccess>(this.accessId);
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/cvm/v20170312/index.js');
    const CvmClient = sdk.v20170312.Client;

    if (!this.region) {
      throw new Error('所在地域不能为空');
    }

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: this.region,
      profile: {
        httpProfile: {
          endpoint: `cvm.${accessProvider.intlDomain()}tencentcloudapi.com`,
        },
      },
    };

    return new CvmClient(clientConfig);
  }

  async onGetInstanceList(data: any) {
    const cvmClient = await this.getCvmClient();
    const res = await cvmClient.DescribeInstances({
      Limit: 100,
    });
    this.checkRet(res);

    this.ctx.logger.info('获取实列列表:', res);
    return res.InstanceSet.map((item: any) => {
      return {
        label: item.InstanceName,
        value: item.InstanceId,
      };
    });
  }
}

new TencentActionInstancesPlugin();
