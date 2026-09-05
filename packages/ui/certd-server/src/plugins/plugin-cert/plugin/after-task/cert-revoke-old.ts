import { AbstractTaskPlugin, IsTaskPlugin, TaskInput } from "@certd/pipeline";
import { In } from "typeorm";
import { CertInfoService } from "../../../../modules/monitor/index.js";
import { CertStatus } from "../../../../modules/monitor/entity/cert-info.js";

/**
 * 吊销旧证书（流水线后置任务）
 *
 * 在流水线运行结束后触发（可在插件内配置等待时长）：
 * 将该流水线中“同一证书申请任务”产出的、已被新证书替换的未激活（inactive）旧证书，
 * 真实调用 CA 吊销，并将证书仓库记录标记为已吊销（revoked）。
 * 只吊销与证书申请任务 id 相同的旧证书，其他任务产出的证书不受影响。
 * 本任务失败时，流水线整体视为执行失败。
 */
@IsTaskPlugin({
  name: "CertRevokeOld",
  title: "吊销旧证书",
  group: "cert",
  icon: "tabler:certificate-off",
  desc: "新证书申请成功，并全部部署成功后，吊销本流水线产生的旧证书。（注意 如果本流水线证书还在别处有使用或手动部署，请慎重添加此吊销任务）",
  supportAfterTask: true,
})
export class CertRevokeOldPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "吊销未激活的旧证书",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    order: 0,
    helper: "勾选后，将真实调用证书颁发机构吊销该流水线已被替换的旧证书",
  })
  revokeOld = true;

  @TaskInput({
    title: "等待时长（秒）",
    value: 50,
    component: {
      name: "a-input-number",
      vModel: "value",
      min: 0,
    },
    order: 1,
    helper: "执行吊销前等待的秒数，确保新证书生效后再吊销旧证书",
  })
  delay = 50;

  /**
   * 证书申请类插件类型：证书仓库按这些任务的 id 记录来源，吊销时按相同任务 id 精确匹配
   */
  certApplyTypes = ["CertApply", "CertApplyLego", "CertApplyGetFormAliyun", "CertApplyUpload"];

  /**
   * 收集本流水线中所有证书申请任务的 id（taskId）
   */
  collectApplyTaskIds(): string[] {
    const taskIds: string[] = [];
    for (const stage of this.pipeline.stages || []) {
      for (const task of stage.tasks || []) {
        for (const step of task.steps || []) {
          if (this.certApplyTypes.includes(step.type)) {
            taskIds.push(step.id);
          }
        }
      }
    }
    return taskIds;
  }

  async execute() {
    if (!this.revokeOld) {
      this.logger.info("已关闭吊销旧证书开关，跳过");
      return "skip";
    }

    if (this.delay > 0) {
      this.logger.info(`等待 ${this.delay} 秒后开始吊销旧证书`);
      await this.sleep(this.delay * 1000);
      this.checkSignal();
    }

    // 只吊销与证书申请任务 id 相同的旧证书（不误伤其他任务产出的证书）
    const taskIds = this.collectApplyTaskIds();
    if (taskIds.length === 0) {
      this.logger.warn("未找到证书申请任务，无法按任务匹配吊销旧证书");
      return "skip";
    }

    const certInfoService = await this.ctx.serviceGetter.get<CertInfoService>("certInfoService");
    const pipelineId = this.pipeline.id;
    const list = await certInfoService.find({
      where: {
        pipelineId,
        status: CertStatus.inactive,
        taskId: In(taskIds),
      },
    });
    if (!list || list.length === 0) {
      this.logger.info("没有需要吊销的旧证书");
      return "skip";
    }
    this.logger.info(`找到 ${list.length} 个未激活的旧证书，开始吊销`);
    for (const cert of list) {
      this.logger.info(`吊销旧证书 #${cert.id}（域名:${cert.domains || "-"}）`);
      await certInfoService.revoke(cert.id, this.ctx.user.id, this.ctx.projectId);
      this.logger.info(`旧证书 #${cert.id} 吊销成功`);
    }
  }
}
