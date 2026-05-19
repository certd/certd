import { forEach } from "lodash-es";
import { mySuiteApi } from "/@/views/certd/suite/mine/api";
import { notification } from "ant-design-vue";
import { useSettingStore } from "/@/store/settings";
import { ReadCertDetail } from "./api";
import { util } from "/@/utils";
export function eachStages(list: any[], exec: (item: any, runnableType: string) => void, runnableType: string = "stage") {
  if (!list || list.length <= 0) {
    return;
  }
  forEach(list, item => {
    exec(item, runnableType);
    if (runnableType === "stage") {
      eachStages(item.tasks, exec, "task");
    } else if (runnableType === "task") {
      eachStages(item.steps, exec, "step");
    }
  });
}

export function eachSteps(pipeline: any, callback: any) {
  const pp = pipeline;
  if (pp.stages) {
    for (const stage of pp.stages) {
      if (stage.tasks) {
        for (const task of stage.tasks) {
          if (task.steps) {
            for (const step of task.steps) {
              callback(step, task, stage);
            }
          }
        }
      }
    }
  }
}

export function findStep(pipeline: any, id: string) {
  const pp = pipeline;
  if (pp.stages) {
    for (const stage of pp.stages) {
      if (stage.tasks) {
        for (const task of stage.tasks) {
          if (task.steps) {
            for (const step of task.steps) {
              if (step.id === id) {
                return step;
              }
            }
          }
        }
      }
    }
  }
}

export async function checkPipelineLimit() {
  const settingsStore = useSettingStore();
  if (settingsStore.isEnterprise) {
    //企业模式不限制
    return;
  }
  if (settingsStore.isComm && settingsStore.suiteSetting.enabled) {
    //检查数量是否超限

    const suiteDetail = await mySuiteApi.SuiteDetailGet();
    const max = suiteDetail.pipelineCount.max;
    if (max != -1 && max <= suiteDetail.pipelineCount.used) {
      notification.error({
        message: `对不起，您最多只能创建${max}条流水线，请购买或升级套餐`,
      });
      throw new Error("流水线数量超限");
    }
  }
}

export async function readCertDetail(crt: string) {
  const cached = await util.cache.get(crt);
  if (cached) {
    return cached;
  }
  const res = await ReadCertDetail(crt);
  await util.cache.set(crt, res);
  return res;
}

export async function getAllDomainsFromCrt(crt: string) {
  const { detail } = await readCertDetail(crt);
  const altNames = detail.domains.altNames;
  const commonName = detail.domains.commonName;
  if (altNames.includes(commonName)) {
    return altNames;
  }
  return [commonName, ...altNames];
}
