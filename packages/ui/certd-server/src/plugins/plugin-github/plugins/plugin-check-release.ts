import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { GithubAccess } from "../access.js";
import { SshClient } from "../../plugin-lib/ssh/ssh.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "GithubCheckRelease",
  title: "Github-检查Release版本",
  desc: "检查最新Release版本并推送消息",
  icon: "ion:logo-github",
  //插件分组
  group: pluginGroups.other.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class GithubCheckRelease extends AbstractTaskPlugin {
  //授权选择框
  @TaskInput({
    title: "Github授权",
    component: {
      name: "access-selector",
      type: "github", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;

  @TaskInput({
    title: "仓库名称",
    helper: "owner/name，比如 certd/certd",
    required: true,
  })
  repoName!: string;

  @TaskInput({
    title: "通知渠道",
    component: {
      name: "notification-selector",
      select: {
        mode: "tags",
      },
    },
    required: false,
  })
  notificationIds!: number[];

  @TaskOutput({
    title: "最后版本",
  })
  lastVersion?: string;

  @TaskInput({
    title: "主机登录配置",
    helper: "登录",
    component: {
      name: "access-selector",
      type: "ssh",
    },
    required: false,
  })
  sshAccessId!: string;

  @TaskInput({
    title: "shell脚本命令",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 6,
      placeholder: `
# 拉取最新镜像
docker pull registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
# 升级容器命令， 替换成你自己的实际部署位置及更新命令
export RESTART_CERT='sleep 10; cd ~/deploy/certd/ ; docker compose down; docker compose up -d'
# 构造一个脚本10s后在后台执行，避免容器销毁时执行太快，导致流水线任务无法结束
nohup sh -c '$RESTART_CERT' >/dev/null  2>&1 & echo '10秒后重启' && exit`,
    },
    helper: `有新版本后执行命令，比如：拉取最新版镜像，然后重建容器
注意：自己升级自己需要使用nohup配合sleep
自动升级命令示例：
docker pull registry.cn-shenzhen.aliyuncs.com/handsfree/certd:latest
export RESTART_CERT='sleep 10; cd ~/deploy/certd/ ; docker compose down; docker compose up -d'
nohup sh -c '$RESTART_CERT' >/dev/null  2>&1 & echo '10秒后重启' && exit
`,
    required: false,
  })
  script!: string;

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<string> {
    const access = await this.getAccess<GithubAccess>(this.accessId);
    const res = await access.getRelease({ repoName: this.repoName });
    if (res == null) {
      throw new Error(`获取${this.repoName}最新版本失败`);
    }
    const lastVersion = this.ctx.lastStatus?.status?.output?.lastVersion;

    if (res.tag_name == null || res.tag_name == lastVersion) {
      this.logger.info(`暂无更新，${res.tag_name}`);
      this.lastVersion = res.tag_name || lastVersion;
      return "skip";
    }
    //有更新
    this.logger.info(`有更新,${lastVersion ?? "0"}->${res.tag_name}`);
    this.lastVersion = res.tag_name;

    // const body = res.body.replaceAll("* ","- ")
    //仅每行开头的* 替换成 -， *号前面可以有空格
    const body = res.body.replace(/^(\s*)\* /gm, "$1- ");

    if (this.notificationIds && this.notificationIds.length > 0) {
      //发送通知
      for (const notificationId of this.notificationIds) {
        await this.ctx.notificationService.send({
          id: notificationId,
          useDefault: false,
          useEmail: false,
          logger: this.logger,
          body: {
            title: `${this.repoName} 新版本 ${this.lastVersion} 发布`,
            content: `${body}\n\n > [Certd](https://certd.docmirror.cn)，不止证书自动化，插件解锁无限可能！\n\n`,
            url: `https://github.com/${this.repoName}/releases/tag/${this.lastVersion}`,
            notificationType: "githubReleaseCheck",
          },
        });
      }
    }

    if (this.script != null && this.script.trim() != "") {
      const connectConf = await this.getAccess(this.sshAccessId);
      const sshClient = new SshClient(this.logger);
      const scripts = this.script.split("\n");
      await sshClient.exec({
        connectConf,
        script: scripts,
        env: {
          REPO: this.repoName,
          LAST_VERSION: this.lastVersion,
        },
      });
    }
  }
}

new GithubCheckRelease();
