import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { AbstractPlusTaskPlugin, SynologyClient } from "@certd/plugin-plus";
import dayjs from "dayjs";
import { SynologyAccess } from "../access.js";
@IsTaskPlugin({
  name: "SynologyKeepAlive",
  title: "群晖-刷新OTP登录有效期",
  icon: "simple-icons:synology",
  group: pluginGroups.panel.key,
  desc: "群晖登录状态可能30天失效，需要在失效之前登录一次，刷新有效期，您可以将其放在“部署到群晖面板”任务之后",
  showRunStrategy: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: true,
})
export class SynologyKeepAlivePlugin extends AbstractPlusTaskPlugin {
 

  @TaskInput({
    title: "群晖授权",
    helper: "群晖登录授权，请确保账户是管理员用户组",
    component: {
      name: "access-selector",
      type: "synology",
    },
    required: true,
  })
  accessId!: string;


   //授权选择框
  @TaskInput({
    title: "间隔天数",
    helper: "多少天刷新一次，建议15天以内",
    value: 15,
    component: {
      name: "a-input-number",
      vModel:"value",
    },
    required: true,
  })
  intervalDays!: number;

  @TaskOutput({
    title: "上次刷新时间",
    type :"SynologyLastRefreshTime"
  })
  lastRefreshTime!: number;

  async onInstance() {}
  async execute(): Promise<any> {
    this.logger.info("开始刷新群晖登录有效期");
    const now = dayjs()
    const status = this.getLastStatus();
    if (status) {
      let lastRefreshTime = this.getLastOutput("lastRefreshTime");
      lastRefreshTime = lastRefreshTime || 0;
      this.lastRefreshTime = lastRefreshTime;
      const lastTime = dayjs(lastRefreshTime);
      const diffDays = now.diff(lastTime, "day");
      
      this.logger.info(`上次刷新时间${lastTime.format("YYYY-MM-DD")}`);
      if (diffDays < this.intervalDays) {
        this.logger.info(`距离上次刷新${diffDays}天，不足${this.intervalDays}天，无需刷新`);
        this.logger.info(`下一次刷新时间${lastTime.add(this.intervalDays, "day").format("YYYY-MM-DD")}`);
        return "skip";
      }else{
         this.logger.info(`超过${this.intervalDays}天，需要刷新`);
      }

    }

    const access: SynologyAccess = await this.getAccess<SynologyAccess>(this.accessId);
    const client = new SynologyClient(access as any, this.ctx.http, this.ctx.logger, access.skipSslVerify);
    await client.doLogin();
    await client.getCertList();
    this.lastRefreshTime = now.valueOf();
    this.logger.info("刷新群晖登录有效期成功");
  }

  
}
new SynologyKeepAlivePlugin();
