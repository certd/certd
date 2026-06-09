import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import dayjs from "dayjs";
import { remove } from "lodash-es";
import { TencentAccess, TencentSslClient } from "../../../plugin-lib/tencent/index.js";

@IsTaskPlugin({
  name: "TencentDeleteExpiringCert",
  title: "腾讯云-删除即将过期证书",
  icon: "svg:icon-tencentcloud",
  group: pluginGroups.tencent.key,
  desc: "仅删除未使用的证书",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: true,
})
export class TencentDeleteExpiringCert extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: "Access提供者",
    helper: "access 授权",
    component: {
      name: "access-selector",
      type: "tencent",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "关键字筛选",
    helper: "仅匹配ID、备注名称、域名包含关键字的证书，可以不填",
    required: false,
    component: {
      name: "a-input",
    },
  })
  searchKey!: string;

  @TaskInput({
    title: "最大删除数量",
    helper: "单次运行最大删除数量",
    value: 100,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
  })
  maxCount!: number;

  @TaskInput({
    title: "即将过期天数",
    helper: "仅删除有效期小于此天数的证书",
    value: 18,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
  })
  expiringDays!: number;

  @TaskInput({
    title: "检查超时时间",
    helper: "检查删除任务结果超时时间,单位分钟",
    value: 10,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
  })
  checkTimeout!: number;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<TencentAccess>(this.accessId);
    const sslClient = new TencentSslClient({
      access,
      logger: this.logger,
    });

    const params = {
      Limit: this.maxCount ?? 100,
      SearchKey: this.searchKey,
      ExpirationSort: "ASC",
      FilterSource: "upload",
      // FilterExpiring: 1,
    };
    const res = await sslClient.DescribeCertificates(params);
    let certificates = res?.Certificates;
    if (!certificates && certificates.length === 0) {
      this.logger.info("没有找到证书");
      return;
    }

    const lastDay = dayjs().add(this.expiringDays, "day");
    certificates = certificates.filter((item: any) => {
      const endTime = item.CertEndTime;
      return dayjs(endTime).isBefore(lastDay);
    });
    for (const certificate of certificates) {
      this.logger.info(`证书ID:${certificate.CertificateId}, 过期时间:${certificate.CertEndTime}，Alias:${certificate.Alias}，证书域名:${certificate.Domain}`);
    }
    this.logger.info(`即将过期的证书数量:${certificates.length}`);
    if (certificates.length === 0) {
      this.logger.info("没有即将过期的证书, 无需删除");
      return;
    }
    const certIds = certificates.map((cert: any) => cert.CertificateId);

    const deleteRes = await sslClient.doRequest("DeleteCertificates", {
      CertificateIds: certIds,
      IsSync: true,
    });
    this.logger.info("删除任务已提交: ", JSON.stringify(deleteRes));
    const ids = deleteRes?.CertTaskIds;
    if (!ids && !ids.length) {
      this.logger.error("没有找到任务ID");
      return;
    }
    const taskIds = ids.map((id: any) => id.TaskId);
    const startTime = Date.now();
    const results = {};

    const statusCount = {
      success: 0,
      failed: 0,
      unauthorized: 0,
      unbind: 0,
      timeout: 0,
    };
    const total = taskIds.length;

    while (Date.now() < startTime + this.checkTimeout * 60 * 1000) {
      this.checkSignal();
      const taskResultRes = await sslClient.doRequest("DescribeDeleteCertificatesTaskResult", {
        TaskIds: taskIds,
      });
      const result = taskResultRes.DeleteTaskResult;
      if (!result || result.length === 0) {
        this.logger.info("暂未获取到有效的任务结果");
        continue;
      }
      for (const item of result) {
        //遍历结果
        const status = item.Status;
        if (status !== 0) {
          remove(taskIds, id => id === item.TaskId);
        }
        // Status : 0表示任务进行中、 1表示任务成功、 2表示任务失败、3表示未授权服务角色导致任务失败、4表示有未解绑的云资源导致任务失败、5表示查询关联云资源超时导致任务失败
        if (status === 0) {
          this.logger.info(`任务${item.TaskId}<${item.CertId}>: 进行中`);
        } else if (status === 1) {
          this.logger.info(`任务${item.TaskId}<${item.CertId}>: 成功`);
          results[item.TaskId] = "成功";
          statusCount.success++;
        } else if (status === 2) {
          this.logger.error(`任务${item.TaskId}<${item.CertId}>: 失败`);
          results[item.TaskId] = "失败";
          statusCount.failed++;
        } else if (status === 3) {
          this.logger.error(`任务${item.TaskId}<${item.CertId}>: 未授权服务角色导致任务失败`);
          results[item.TaskId] = "未授权服务角色导致任务失败";
          statusCount.unauthorized++;
        } else if (status === 4) {
          this.logger.error(`任务${item.TaskId}<${item.CertId}>: 有未解绑的云资源导致任务失败`);
          results[item.TaskId] = "有未解绑的云资源导致任务失败";
          statusCount.unbind++;
        } else if (status === 5) {
          this.logger.error(`任务${item.TaskId}<${item.CertId}>: 查询关联云资源超时导致任务失败`);
          results[item.TaskId] = "查询关联云资源超时导致任务失败";
          statusCount.timeout++;
        } else {
          this.logger.info(`任务${item.TaskId}<${item.CertId}>: 未知状态:${status}`);
          statusCount.failed++;
        }
      }
      this.logger.info(
        // eslint-disable-next-line max-len
        `任务总数:${total}, 进行中：${taskIds.length}， 成功:${statusCount.success}, 未授权服务角色导致失败:${statusCount.unauthorized}, 未解绑关联资源失败:${statusCount.unbind}, 查询关联资源超时:${statusCount.timeout}，未知原因失败:${statusCount.failed}`
      );
      if (taskIds.length === 0) {
        this.logger.info("任务已全部完成");

        if (statusCount.unauthorized > 0) {
          throw new Error("有未授权服务角色导致任务失败，需给Access授权服务角色SSL_QCSLinkedRoleInReplaceLoadCertificate");
        }

        return;
      }
      await this.ctx.utils.sleep(10000);
    }
    this.logger.error("检查任务结果超时", JSON.stringify(results));
  }
}

new TencentDeleteExpiringCert();
