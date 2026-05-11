import { checkPipelineLimit } from "/@/views/certd/pipeline/utils";
import { cloneDeep, merge, omit } from "lodash-es";
import { message } from "ant-design-vue";
import { nanoid } from "nanoid";
import { useRouter } from "vue-router";
import { compute, CreateCrudOptionsRet, dict, useFormWrapper } from "@fast-crud/fast-crud";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { useReference } from "/@/use/use-refrence";
import { computed, provide, Ref, ref } from "vue";
import * as api from "../api";
import { PluginGroup, usePluginStore } from "/@/store/plugin";
import { createNotificationApi } from "/@/views/certd/notification/api";
import GroupSelector from "../group/group-selector.vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/@/store/settings";
import dayjs from "dayjs";

export function fillPipelineByDefaultForm(pipeline: any, form: any) {
  const triggers = [];

  //根据随机时间设置触发时间
  if (form.random === true) {
    // 随机时间
    const randomRange = form.randomRange;
    const start = dayjs().format("YYYY-MM-DD") + " " + randomRange[0];
    let end = dayjs().format("YYYY-MM-DD") + " " + randomRange[1];
    if (randomRange[1] < randomRange[0]) {
      //跨天
      end = dayjs().add(1, "day").format("YYYY-MM-DD") + " " + randomRange[1];
    }
    const startTime = dayjs(start).valueOf();
    const endTime = dayjs(end).valueOf();
    const randomTime = Math.floor(Math.random() * (endTime - startTime)) + startTime;
    const time = dayjs(randomTime).format(" ss:mm:HH").replaceAll(":", " ").replaceAll(" 0", " ").trim();
    triggers.push({ title: "定时触发", type: "timer", props: { cron: `${time} * * *` } });
  } else if (form.triggerCron) {
    triggers.push({ title: "定时触发", type: "timer", props: { cron: form.triggerCron } });
  }
  if (form.webhookEnabled) {
    triggers.push({ title: "Webhook触发", type: "webhook" });
  }
  const notifications = [];
  if (form.notification != null) {
    notifications.push({
      type: "custom",
      when: form.notificationWhen || ["error", "turnToSuccess"],
      notificationId: form.notification,
      title: form.notificationTarget?.name || "自定义通知",
    });
  }
  pipeline.triggers = triggers;
  pipeline.notifications = notifications;
  return pipeline;
}

export function setRunnableIds(pipeline: any) {
  const { t } = useI18n();
  const idMap: any = {};
  function createId(oldId: any) {
    if (oldId == null) {
      return nanoid();
    }
    const newId = nanoid();
    idMap[oldId] = newId;
    return newId;
  }
  if (pipeline.stages) {
    for (const stage of pipeline.stages) {
      stage.id = createId(stage.id);
      if (stage.tasks) {
        for (const task of stage.tasks) {
          task.id = createId(task.id);
          if (task.steps) {
            for (const step of task.steps) {
              step.id = createId(step.id);
            }
          }
        }
      }
    }
  }

  for (const trigger of pipeline.triggers) {
    trigger.id = nanoid();
  }
  for (const notification of pipeline.notifications) {
    notification.id = nanoid();
  }

  let content = JSON.stringify(pipeline);
  for (const key in idMap) {
    content = content.replaceAll(key, idMap[key]);
  }
  return JSON.parse(content);
}

export function useCertPipelineCreator({ formWrapperRef }: { formWrapperRef: Ref<any> }) {
  const { t } = useI18n();

  function open(opts: any) {
    return new Promise((resolve, reject) => {
      formWrapperRef.value.open(opts);
    });
  }
  const { openCrudFormDialog } = useFormWrapper({ open });

  const pluginStore = usePluginStore();
  const settingStore = useSettingStore();
  const router = useRouter();

  function createCrudOptions(req: { certPlugin: any; doSubmit: any; title?: string; initialForm?: any }): CreateCrudOptionsRet {
    const inputs: any = {};
    const moreParams = [];
    const doSubmit = req.doSubmit;
    const certPlugin = req.certPlugin;
    for (const inputKey in certPlugin.input) {
      // inputs[inputKey].form.show = true;
      const inputDefine = cloneDeep(certPlugin.input[inputKey]);
      if (inputDefine.maybeNeed) {
        moreParams.push("input." + inputKey);
      }
      useReference(inputDefine);
      inputs["input." + inputKey] = {
        title: inputDefine.title,
        form: {
          ...inputDefine,
        },
      };
    }
    const pluginStore = usePluginStore();
    const randomHour = Math.floor(Math.random() * 6);
    const randomMin = Math.floor(Math.random() * 60);
    const randomCron = `0 ${randomMin} ${randomHour} * * *`;

    const groupDictRef = dict({
      url: "/pi/pipeline/group/all",
      value: "id",
      label: "name",
    });

    const DEFAULT_RENEW_DAYS = settingStore.sysPublic.defaultCertRenewDays || settingStore.sysPublic.defaultWillExpireDays || 20;

    merge(inputs, {
      "input.renewDays": {
        form: {
          value: DEFAULT_RENEW_DAYS,
        },
      },
    });

    const initialForm = req.initialForm || {};
    initialForm.type = certPlugin.name;
    return {
      crudOptions: {
        form: {
          initialForm: initialForm,
          doSubmit,
          wrapper: {
            wrapClassName: "cert_pipeline_create_form",
            width: 1350,
            saveRemind: false,
            title: req.title || t("certd.pipelineForm.createTitle"),
          },
          group: {
            groups: {
              more: {
                header: t("certd.pipelineForm.moreParams"),
                columns: moreParams,
                collapsed: true,
              },
            },
          },
        },
        columns: {
          ...inputs,
          triggerCron: {
            title: t("certd.pipelineForm.triggerCronTitle"),
            type: "text",
            form: {
              value: randomCron,
              component: {
                name: "cron-editor",
                vModel: "modelValue",
                placeholder: "0 0 4 * * * (表示凌晨4点执行)",
              },
              helper: t("certd.pipelineForm.triggerCronHelper"),
              order: 100,
            },
          },
          notification: {
            title: t("certd.pipelineForm.notificationTitle"),
            type: "text",
            form: {
              value: 0,
              component: {
                name: NotificationSelector,
                vModel: "modelValue",
                on: {
                  selectedChange({ $event, form }) {
                    form.notificationTarget = $event;
                  },
                },
              },
              order: 101,
              helper: t("certd.pipelineForm.notificationHelper"),
            },
          },
          notificationWhen: {
            title: t("certd.pipelineForm.notificationWhen"),
            type: "text",
            form: {
              value: ["error", "turnToSuccess"],
              component: {
                name: "a-select",
                vModel: "value",
                mode: "multiple",
                options: [
                  { value: "start", label: t("certd.start_time") },
                  { value: "success", label: t("certd.success_time") },
                  { value: "turnToSuccess", label: t("certd.fail_to_success_time") },
                  { value: "error", label: t("certd.fail_time") },
                ],
              },
              order: 102,
            },
          },
          groupId: {
            title: t("certd.pipelineForm.groupIdTitle"),
            type: "dict-select",
            dict: groupDictRef,
            form: {
              component: {
                name: GroupSelector,
                vModel: "modelValue",
              },
              order: 888,
            },
          },
          addToMonitorEnabled: {
            title: t("certd.pipelineForm.addToMonitorEnabled"),
            type: "switch",
            form: {
              show: computed(() => {
                return settingStore.isPlus && settingStore.sysPublic?.certDomainAddToMonitorEnabled;
              }),
              value: false,
              component: {
                name: "a-switch",
                vModel: "checked",
              },
              col: {
                span: 24,
              },
              order: 999,
              valueChange({ value, form }) {
                if (value) {
                  form.addToMonitorDomains = form.domains.join("\n").replaceAll("*", "www");
                }
              },
            },
          },
          addToMonitorDomains: {
            title: t("certd.pipelineForm.addToMonitorDomains"),
            type: "text",
            form: {
              show: compute(({ form }) => {
                return form.addToMonitorEnabled;
              }),
              component: {
                name: "a-textarea",
                vModel: "value",
              },
              col: {
                span: 24,
              },
              helper: t("certd.domainList.helper"),
              order: 999,
            },
          },
          webhookEnabled: {
            title: t("certd.pipelineForm.webhookEnabled"),
            type: "switch",
            form: {
              helper: t("certd.pipelineForm.webhookEnabledHelper"),
              value: false,
              component: {
                name: "a-switch",
                vModel: "checked",
              },
              col: {
                span: 24,
              },
              order: 999,
            },
          },
        },
      },
    };
  }

  async function getCertPlugins() {
    const pluginGroup = await pluginStore.getGroups();
    const pluginGroups: { [key: string]: PluginGroup } = pluginGroup.groups;
    const certPluginGroup = pluginGroups.cert;

    const certPlugins = [];
    for (const plugin of certPluginGroup.plugins) {
      const detail: any = await pluginStore.getPluginDefine(plugin.name);
      certPlugins.push(detail);
    }
    return certPlugins;
  }

  async function openAddCertdPipelineDialog(req: { pluginName: string; defaultGroupId?: number; title?: string; currentPluginRef: Ref<any> }) {
    //检查是否流水线数量超出限制
    await checkPipelineLimit();

    //设置系统初始值
    const initialForm: any = { input: {} };
    const pluginSysConfig = await pluginStore.getPluginConfig({ name: req.pluginName, type: "builtIn" });
    if (pluginSysConfig.sysSetting?.input) {
      for (const key in pluginSysConfig.sysSetting?.input) {
        initialForm.input[key] = pluginSysConfig.sysSetting?.input[key];
      }
    }

    async function doSubmit({ form }: any) {
      // const certDetail = readCertDetail(form.cert.crt);
      // 添加certd pipeline
      const pluginInput = form.input;
      let pipeline: any = {
        title: pluginInput.domains[0] + "证书自动化",
        runnableType: "pipeline",
        stages: [
          {
            title: "证书申请阶段",
            maxTaskCount: 1,
            runnableType: "stage",
            tasks: [
              {
                title: "证书申请任务",
                runnableType: "task",
                steps: [
                  {
                    title: "申请证书",
                    runnableType: "step",
                    input: {
                      renewDays: 20,
                      ...pluginInput,
                    },
                    strategy: {
                      runStrategy: 0, // 正常执行
                    },
                    type: req.pluginName,
                  },
                ],
              },
            ],
          },
        ],
      };

      pipeline = fillPipelineByDefaultForm(pipeline, form);

      pipeline = setRunnableIds(pipeline);
      const groupId = form.groupId;
      const { id } = await api.Save({
        title: pipeline.title,
        content: JSON.stringify(pipeline),
        keepHistoryCount: 30,
        type: "cert",
        groupId,
        addToMonitorEnabled: form.addToMonitorEnabled,
        addToMonitorDomains: form.addToMonitorDomains,
      });
      if (form.email) {
        try {
          //创建一个默认的邮件通知
          const notificationApi = createNotificationApi();
          await notificationApi.GetOrCreateDefault({ email: form.email });
        } catch (e) {
          console.error(e);
        }
      }
      message.success("创建成功,请添加证书部署任务");
      router.push({ path: "/certd/pipeline/detail", query: { id, editMode: "true" } });
    }
    const certPlugins = await getCertPlugins();
    const certPlugin = certPlugins.find(plugin => plugin.name === req.pluginName);
    if (!certPlugin) {
      message.error("该证书申请插件不存在");
      return;
    }

    req.currentPluginRef.value = certPlugin;
    const { crudOptions } = createCrudOptions({
      certPlugin,
      doSubmit,
      title: req.title,
      initialForm,
    });
    //@ts-ignore
    crudOptions.columns.groupId.form.value = req.defaultGroupId || undefined;
    await openCrudFormDialog({ crudOptions });
  }

  return {
    openAddCertdPipelineDialog,
  };
}
