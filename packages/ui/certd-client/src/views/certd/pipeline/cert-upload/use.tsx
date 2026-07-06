import { compute, dict, useFormWrapper } from "@fast-crud/fast-crud";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import { cloneDeep, omit } from "lodash-es";
import { useReference } from "/@/use/use-refrence";
import { ref } from "vue";
import * as api from "../api";
import { checkPipelineLimit, getAllDomainsFromCrt } from "/@/views/certd/pipeline/utils";
import { useRouter } from "vue-router";
import { nanoid } from "nanoid";
import { usePluginStore } from "/@/store/plugin";
import GroupSelector from "/@/views/certd/pipeline/group/group-selector.vue";

export function useCertUpload() {
  const { openCrudFormDialog } = useFormWrapper();
  const router = useRouter();

  const certInputs = {
    "uploadCert.crt": {
      title: "证书",
      type: "text",
      form: {
        component: {
          name: "pem-input",
          vModel: "modelValue",
          textarea: {
            rows: 4,
            placeholder: "-----BEGIN CERTIFICATE-----\n...\n...\n-----END CERTIFICATE-----",
          },
        },
        helper: "选择pem格式证书文件，或者粘贴到此",
        rules: [{ required: true, message: "此项必填" }],
        col: { span: 24 },
        order: -9999,
      },
    },
    "uploadCert.key": {
      title: "证书私钥",
      type: "text",
      form: {
        component: {
          name: "pem-input",
          vModel: "modelValue",
          textarea: {
            rows: 4,
            placeholder: "-----BEGIN PRIVATE KEY-----\n...\n...\n-----END PRIVATE KEY----- ",
          },
        },
        helper: "选择pem格式证书私钥文件，或者粘贴到此",
        rules: [{ required: true, message: "此项必填" }],
        col: { span: 24 },
        order: -9999,
      },
    },
  };

  const pluginStore = usePluginStore();

  async function buildUploadCertPluginInputs(getFormData: any) {
    const plugin: any = await pluginStore.getPluginDefine("CertApplyUpload");
    const inputs: any = {};
    for (const inputKey in plugin.input) {
      if (inputKey === "uploadCert" || inputKey === "domains") {
        continue;
      }
      const inputDefine = cloneDeep(plugin.input[inputKey]);
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
            return inputDefineShow;
          }),
        },
      };
    }
    return inputs;
  }

  async function openUploadCreateDialog(req: { defaultGroupId?: number }) {
    //检查是否流水线数量超出限制
    await checkPipelineLimit();

    const wrapperRef = ref();
    function getFormData() {
      if (!wrapperRef.value) {
        return null;
      }
      return wrapperRef.value.getFormData();
    }
    const inputs = await buildUploadCertPluginInputs(getFormData);
    const groupDictRef = dict({
      url: "/pi/pipeline/group/all",
      value: "id",
      label: "name",
    });
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: {
            ...cloneDeep(certInputs),
            ...inputs,
            notification: {
              title: "失败通知",
              type: "text",
              form: {
                value: 0,
                component: {
                  name: NotificationSelector,
                  vModel: "modelValue",
                  on: {
                    selectedChange({ $event, form }: any) {
                      form.notificationTarget = $event;
                    },
                  },
                },
                order: 101,
                helper: "任务执行失败实时提醒",
              },
            },
            groupId: {
              title: "流水线分组",
              type: "dict-select",
              dict: groupDictRef,
              form: {
                component: {
                  name: GroupSelector,
                  vModel: "modelValue",
                },
                value: req.defaultGroupId || undefined,
                order: 9999,
              },
            },
          },
          form: {
            wrapper: {
              title: "上传证书&创建部署流水线",
              saveRemind: false,
            },
            async doSubmit({ form }: any) {
              const cert = form.uploadCert;
              const domains = await getAllDomainsFromCrt(cert.crt);

              const notifications = [];
              if (form.notification != null) {
                notifications.push({
                  type: "custom",
                  when: ["error", "turnToSuccess", "success"],
                  notificationId: form.notification,
                  title: form.notificationTarget?.name || "自定义通知",
                });
              }

              const pipelineTitle = domains[0] + "上传证书部署";
              const input = omit(form, ["id", "cert", "notification", "notificationTarget"]);
              const pipeline = {
                title: pipelineTitle,
                runnableType: "pipeline",
                stages: [
                  {
                    id: nanoid(10),
                    title: "上传证书解析阶段",
                    maxTaskCount: 1,
                    runnableType: "stage",
                    tasks: [
                      {
                        id: nanoid(10),
                        title: "上传证书解析转换",
                        runnableType: "task",
                        steps: [
                          {
                            id: nanoid(10),
                            title: "上传证书解析转换",
                            runnableType: "step",
                            input: {
                              cert: cert,
                              domains: domains,
                              ...input,
                            },
                            strategy: {
                              runStrategy: 0, // 正常执行
                            },
                            type: "CertApplyUpload",
                          },
                        ],
                      },
                    ],
                  },
                ],
                notifications,
              };

              const { id } = await api.Save({
                title: pipeline.title,
                content: JSON.stringify(pipeline),
                keepHistoryCount: 100,
                type: "cert_upload",
                groupId: form.groupId,
              });
              router.push({
                path: "/certd/pipeline/detail",
                query: { id: id, editMode: "true" },
              });
            },
          },
        },
      };
    }
    const { crudOptions } = createCrudOptions();
    const wrapper = await openCrudFormDialog({ crudOptions });
    wrapperRef.value = wrapper;
  }

  async function openUpdateCertDialog(opts: { onSubmit?: any }) {
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: {
            ...cloneDeep(certInputs),
          },
          form: {
            wrapper: {
              title: "手动上传证书",
              saveRemind: false,
            },
            async afterSubmit() {},
            async doSubmit({ form }: any) {
              if (opts.onSubmit) {
                await opts.onSubmit(form);
              }
            },
          },
        },
      };
    }
    const { crudOptions } = createCrudOptions();
    await openCrudFormDialog({ crudOptions });
  }

  return {
    openUploadCreateDialog,
    openUpdateCertDialog,
  };
}
