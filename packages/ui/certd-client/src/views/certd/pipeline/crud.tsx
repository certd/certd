import * as api from "./api";
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import { nanoid } from "nanoid";
import { message, Modal } from "ant-design-vue";
import { env } from "/@/utils/util.env";
import { useUserStore } from "/@/store/modules/user";

export default function ({ crudExpose, context: { certdFormRef } }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const router = useRouter();
  const { t } = useI18n();
  const lastResRef = ref();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    form.content = JSON.stringify({
      title: form.title
    });
    const res = await api.AddObj(form);
    lastResRef.value = res;
    return res;
  };
  function addCertdPipeline() {
    certdFormRef.value.open(async ({ form }: any) => {
      // 添加certd pipeline
      const triggers = [];
      if (form.triggerCron) {
        triggers.push({ id: nanoid(), title: "定时触发", type: "timer", props: { cron: form.triggerCron } });
      }
      const notifications = [];
      if (form.emailNotify) {
        notifications.push({
          id: nanoid(),
          type: "email",
          when: ["error", "turnToSuccess"],
          options: {
            receivers: [form.email]
          }
        });
      }
      const pipeline = {
        title: form.domains[0] + "证书自动化",
        stages: [
          {
            id: nanoid(),
            title: "证书申请阶段",
            tasks: [
              {
                id: nanoid(),
                title: "证书申请任务",
                steps: [
                  {
                    id: nanoid(),
                    title: "申请证书",
                    input: {
                      renewDays: 20,
                      ...form
                    },
                    strategy: {
                      runStrategy: 0 // 正常执行
                    },
                    type: form.certApplyPlugin
                  }
                ]
              }
            ]
          }
        ],
        triggers,
        notifications
      };

      const id = await api.Save({
        content: JSON.stringify(pipeline),
        keepHistoryCount: 30
      });
      message.success("创建成功,请添加证书部署任务");
      router.push({ path: "/certd/pipeline/detail", query: { id, editMode: "true" } });
    });
  }
  const userStore = useUserStore();
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      actionbar: {
        buttons: {
          add: {
            order: 5,
            text: "自定义流水线"
          },
          addCertd: {
            order: 1,
            text: "添加证书流水线",
            type: "primary",
            click() {
              addCertdPipeline();
            }
          }
        }
      },
      form: {
        afterSubmit({ form, res, mode }) {
          if (mode === "add") {
            router.push({ path: "/certd/pipeline/detail", query: { id: res.id, editMode: "true" } });
          }
        }
      },
      rowHandle: {
        buttons: {
          view: {
            click({ row }) {
              router.push({ path: "/certd/pipeline/detail", query: { id: row.id, editMode: "false" } });
            }
          },
          config: {
            order: 1,
            title: null,
            type: "link",
            icon: "ant-design:edit-outlined",
            click({ row }) {
              router.push({ path: "/certd/pipeline/detail", query: { id: row.id, editMode: "true" } });
            }
          },
          edit: {
            order: 2,
            icon: "ant-design:setting-outlined"
          },
          download: {
            order: 3,
            title: null,
            type: "link",
            icon: "ant-design:download-outlined",
            async click({ row }) {
              const files = await api.GetFiles(row.id);
              Modal.success({
                title: "文件下载",
                okText: "↑↑↑ 点击链接下载",
                content: () => {
                  const children = [];
                  for (const file of files) {
                    const downloadUrl = `${env.API}/pi/history/download?pipelineId=${row.id}&fileId=${file.id}`;
                    children.push(
                      <p>
                        <a href={downloadUrl} target={"_blank"}>
                          {file.filename}
                        </a>
                      </p>
                    );
                  }

                  return <div class={"mt-3"}>{children}</div>;
                }
              });
            }
          },
          remove: {
            order: 5
          }
        }
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        title: {
          title: "流水线名称",
          type: "link",
          search: {
            show: true,
            component: {
              name: "a-input"
            }
          },
          column: {
            width: 300,
            component: {
              on: {
                // 注意：必须要on前缀
                onClick({ row }) {
                  router.push({ path: "/certd/pipeline/detail", query: { id: row.id, editMode: "false" } });
                }
              }
            }
          }
        },
        lastHistoryTime: {
          title: "最后运行",
          type: "datetime",
          form: {
            show: false
          }
        },
        status: {
          title: "状态",
          type: "dict-select",
          dict: dict({
            data: statusUtil.getOptions()
          }),
          form: {
            show: false
          }
        },

        disabled: {
          title: "启用",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: false, label: "启用" },
              { value: true, label: "禁用" }
            ]
          }),
          form: {
            value: false,
            show: false
          },
          column: {
            component: {
              name: "fs-dict-switch",
              vModel: "checked"
            },
            async valueChange({ row, key, value }) {
              return await api.UpdateObj({
                id: row.id,
                disabled: row[key]
              });
            }
          }
        },
        keepHistoryCount: {
          title: "历史记录保持数",
          type: "number",
          form: {
            value: 30,
            helper: "历史记录保持条数，多余的会被删除"
          }
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          form: {
            show: false
          }
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          form: {
            show: false
          }
        }
      }
    }
  };
}
