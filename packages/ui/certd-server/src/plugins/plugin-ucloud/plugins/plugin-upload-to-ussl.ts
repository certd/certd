import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { UCloudAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "UCloudUploadToUSSL",
  title: "UCloud-上传到USSL",
  desc: "将证书上传到UCloud USSL",
  icon: "svg:icon-ucloud",
  //插件分组
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
//类名规范，跟上面插件名称（name）一致
export class UCloudUploadToUSSL extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
    // required: true, // 必填
  })
  cert!: CertInfo;

 

  //授权选择框
  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud" //固定授权类型
    },
    required: true //必填
  })
  accessId!: string;
  //

  @TaskOutput({
    title: "证书ID",
    type: "UCloudCertId",
  })
  certId!: {type:string,id:number,name:string};


  //插件实例化时执行的方法
  async onInstance() {
  }

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    const certId = await access.SslUploadCert({cert:this.cert});
    this.certId = certId;
    this.logger.info("部署完成");
  }



}

//实例化一下，注册插件
new UCloudUploadToUSSL();
