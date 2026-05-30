import { NotificationBody, Step, TaskInput } from "@certd/pipeline";
import dayjs from "dayjs";
import { CertReader } from "@certd/plugin-lib";
import { pick } from "lodash-es";
import { CertApplyBaseConvertPlugin } from "./base-convert.js";

export abstract class CertApplyBasePlugin extends CertApplyBaseConvertPlugin {
  @TaskInput({
    title: "邮箱",
    component: {
      name: "email-selector",
      vModel: "value",
    },
    rules: [{ type: "email", message: "请输入正确的邮箱" }],
    required: true,
    order: -1,
    helper: "请输入邮箱",
  })
  email!: string;

  @TaskInput({
    title: "更新天数",
    value: 20,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
    order: 100,
    helper: "到期前多少天后更新证书，注意：流水线默认不会自动运行，请设置定时器，每天定时运行本流水线",
  })
  renewDays!: number;

  @TaskInput({
    title: "证书申请成功通知",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    order: 100,
    maybeNeed: true,
    helper: "证书申请成功后是否发送通知，优先使用默认通知渠道",
  })
  successNotify = false;

  // @TaskInput({
  //   title: "CsrInfo",
  //   helper: "暂时没有用",
  // })
  csrInfo!: string;

  async onInstance() {
    this.userContext = this.ctx.userContext;
    this.lastStatus = this.ctx.lastStatus as Step;
    await this.onInit();
  }

  abstract onInit(): Promise<void>;

  abstract doCertApply(): Promise<CertReader>;

  async execute(): Promise<string | void> {
    this.logger.addSecret(this.pfxPassword);
    const oldCert = await this.condition();
    if (oldCert != null) {
      await this.output(oldCert, false);
      return "skip";
    }
    const cert = await this.doCertApply();
    if (cert != null) {
      await this.output(cert, true);

      await this.emitCertApplySuccess();
      //清空后续任务的状态，让后续任务能够重新执行
      this.clearLastStatus();

      if (this.successNotify) {
        await this.sendSuccessNotify();
      }
    } else {
      throw new Error("申请证书失败");
    }
  }

  getCheckChangeInputKeys() {
    //插件哪些字段参与校验是否需要更新
    return ["domains", "sslProvider", "privateKeyType", "dnsProviderType", "pfxPassword"];
  }
  /**
   * 是否更新证书
   */
  async condition() {
    // if (this.forceUpdate) {
    //   this.logger.info("强制更新证书选项已勾选，准备申请新证书");
    //   this.logger.warn("申请完之后，切记取消强制更新，避免申请过多证书。");
    //   return null;
    // }

    const checkInputChanges = this.getCheckChangeInputKeys();
    const oldInput = JSON.stringify(pick(this.lastStatus?.input, checkInputChanges));
    const thisInput = JSON.stringify(pick(this, checkInputChanges));
    const inputChanged = oldInput !== thisInput;

    this.logger.info(`旧参数：${oldInput}`);
    this.logger.info(`新参数：${thisInput}`);
    if (inputChanged) {
      this.logger.info("输入参数变更，准备申请新证书");
      return null;
    } else {
      this.logger.info("输入参数未变更，检查证书是否过期");
    }

    let oldCert: CertReader | undefined = undefined;
    try {
      this.logger.info("读取上次证书");
      oldCert = await this.readLastCert();
    } catch (e) {
      this.logger.warn("读取cert失败：", e);
    }
    if (oldCert == null) {
      this.logger.info("还未申请过，准备申请新证书");
      return null;
    }

    const ret = this.isWillExpire(oldCert, this.renewDays);
    if (!ret.isWillExpire) {
      this.logger.info(`证书还未过期：过期时间${dayjs(oldCert.expires).format("YYYY-MM-DD HH:mm:ss")},剩余${ret.leftDays}天`);
      this.logger.info(`证书将在${ret.nextUpdateDays}天后更新（再次运行本任务时）`);
      return oldCert;
    }
    this.logger.info("即将过期，开始更新证书");
    return null;
  }

  /**
   * 检查是否过期，默认提前15天
   * @param expires
   * @param maxDays
   */
  isWillExpire(cert: CertReader, maxDays = 15) {
    const expires = cert.expires;
    if (expires == null) {
      throw new Error("过期时间不能为空");
    }
    const begin = dayjs(cert.detail?.notBefore);

    //证书总天数
    const totalDays = Math.floor((expires - begin.valueOf()) / (1000 * 60 * 60 * 24));
    // 检查有效期
    const leftDays = Math.floor((expires - dayjs().valueOf()) / (1000 * 60 * 60 * 24));
    this.logger.info(`证书有效期剩余天数：${leftDays}`);
    if (totalDays < maxDays) {
      this.logger.warn(`当前更新天数为${maxDays}，证书总天数${totalDays}，总天数小于更新天数（更新天数是指到期前多少天更新证书，您可以在任务配置中调整该值）`);
      maxDays = Math.floor(totalDays / 2);
      if (maxDays < 2) {
        maxDays = 2;
      }
      this.logger.warn(`为避免每次运行都更新证书，更新天数自动减半（即证书最大时长${totalDays}天减半），调整为${maxDays}`);
    }

    return {
      isWillExpire: leftDays <= maxDays,
      leftDays,
      nextUpdateDays: leftDays - maxDays,
    };
  }
  async sendSuccessNotify() {
    this.logger.info("发送证书申请成功通知");
    const url = await this.ctx.urlService.getPipelineDetailUrl(this.pipeline.id, this.ctx.runtime.id);
    const body: NotificationBody = {
      title: `证书申请成功【${this.pipeline.title}】`,
      content: `域名：${this.domains.join(",")}`,
      url: url,
      notificationType: "certApplySuccess",
    };
    try {
      await this.ctx.notificationService.send({
        useDefault: true,
        useEmail: true,
        emailAddress: this.email,
        logger: this.logger,
        body,
      });
    } catch (e) {
      this.logger.error("证书申请成功通知发送失败", e);
    }
  }
}
