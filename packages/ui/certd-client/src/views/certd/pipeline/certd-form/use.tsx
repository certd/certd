import { checkPipelineLimit } from "/@/views/certd/pipeline/utils";
import { cloneDeep, merge, omit } from "lodash-es";
import { message } from "ant-design-vue";
import { nanoid } from "nanoid";
import { useRouter } from "vue-router";
import { compute, CreateCrudOptionsRet, dict, useFormWrapper } from "@fast-crud/fast-crud";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { useReference } from "/@/use/use-refrence";
import { computed, ref } from "vue";
import * as api from "../api";
import { PluginGroup, usePluginStore } from "/@/store/plugin";
import { createNotificationApi } from "/@/views/certd/notification/api";
import GroupSelector from "../group/group-selector.vue";
import { useI18n } from "/src/locales";
import { useSettingStore } from "/@/store/settings";

export function fillPipelineByDefaultForm(pipeline: any, form: any) {
  const triggers = [];
  if (form.triggerCron) {
    triggers.push({ title: "定时触发", type: "timer", props: { cron: form.triggerCron } });
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

export function useCertPipelineCreator() {
  const { t } = useI18n();
  const { openCrudFormDialog } = useFormWrapper();

  const pluginStore = usePluginStore();
  const settingStore = useSettingStore();
  const router = useRouter();

  function createCrudOptions(certPlugins: any[], getFormData: any, doSubmit: any): CreateCrudOptionsRet {
    const inputs: any = {};
    const moreParams = [];
    for (const plugin of certPlugins) {
      for (const inputKey in plugin.input) {
        if (inputs[inputKey]) {
          //如果两个插件有的字段，直接显示
          inputs[inputKey].form.show = true;
          continue;
        }
        const inputDefine = cloneDeep(plugin.input[inputKey]);
        if (!inputDefine.required && !inputDefine.maybeNeed) {
          moreParams.push(inputKey);
          // continue;
        }
        useReference(inputDefine);
        inputs[inputKey] = {
          title: inputDefine.title,
          form: {
            ...inputDefine,
            show: compute(ctx => {
              const form = getFormData();
              if (!form) {
                return false;
              }

              let inputDefineShow = true;
              if (inputDefine.show != null) {
                const computeShow = inputDefine.show as any;
                if (computeShow === false) {
                  inputDefineShow = false;
                } else if (computeShow && computeShow.computeFn) {
                  inputDefineShow = computeShow.computeFn({ form });
                }
              }
              return form?.certApplyPlugin === plugin.name && inputDefineShow;
            }),
          },
        };
      }
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

    return {
      crudOptions: {
        form: {
          doSubmit,
          wrapper: {
            wrapClassName: "cert_pipeline_create_form",
            width: 1350,
            saveRemind: false,
            title: t("certd.pipelineForm.createTitle"),
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
          certApplyPlugin: {
            title: t("certd.plugin.selectTitle"),
            type: "dict-select",
            dict: dict({
              data: [
                { value: "CertApply", label: "JS-ACME" },
                { value: "CertApplyLego", label: "Lego-ACME" },
                { value: "CertApplyGetFormAliyun", label: "Aliyun-Order" },
              ],
            }),
            form: {
              order: 0,
              value: "CertApply",
              helper: {
                render: () => {
                  return (
                    <ul>
                      <li>{t("certd.plugin.jsAcme")}</li>
                      <li>{t("certd.plugin.legoAcme")}</li>
                      <li>{t("certd.plugin.aliyunOrder")}</li>
                    </ul>
                  );
                },
              },
              valueChange: {
                handle: async ({ form, value }) => {
                  const config = await pluginStore.getPluginConfig({
                    name: value,
                    type: "builtIn",
                  });
                  if (config.sysSetting?.input) {
                    merge(form, config.sysSetting.input);
                  }
                },
                immediate: true,
              },
            },
          },
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

  async function openAddCertdPipelineDialog(req: { defaultGroupId?: number }) {
    //检查是否流水线数量超出限制
    await checkPipelineLimit();

    const wrapperRef = ref();
    function getFormData() {
      if (!wrapperRef.value) {
        return null;
      }
      return wrapperRef.value.getFormData();
    }

    async function doSubmit({ form }: any) {
      // const certDetail = readCertDetail(form.cert.crt);
      // 添加certd pipeline
      const pluginInput = omit(form, ["triggerCron", "notification", "notificationTarget", "notificationWhen", "certApplyPlugin", "groupId"]);
      let pipeline: any = {
        title: form.domains[0] + "证书自动化",
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
                      renewDays: 35,
                      ...pluginInput,
                    },
                    strategy: {
                      runStrategy: 0, // 正常执行
                    },
                    type: form.certApplyPlugin,
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
    const { crudOptions } = createCrudOptions(certPlugins, getFormData, doSubmit);
    //@ts-ignore
    crudOptions.columns.groupId.form.value = req.defaultGroupId || undefined;
    const wrapper = await openCrudFormDialog({ crudOptions });
    wrapperRef.value = wrapper;
  }

  return {
    openAddCertdPipelineDialog,
  };
}
