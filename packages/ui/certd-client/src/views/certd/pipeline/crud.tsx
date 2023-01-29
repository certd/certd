import * as api from "./api";
import { useI18n } from "vue-i18n";
import { ref, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { dict } from "@fast-crud/fast-crud";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import { nanoid } from "nanoid";
import { message } from "ant-design-vue";
export default function ({ expose, certdFormRef }) {
  const router = useRouter();
  const { t } = useI18n();
  const lastResRef = ref();
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }) => {
    form.content = JSON.stringify({
      title: form.title
    });
    const res = await api.AddObj(form);
    lastResRef.value = res;
    return res;
  };
  function addCertdPipeline() {
    certdFormRef.value.open(async ({ form }) => {
      // 添加certd pipeline
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
                    type: "CertApply"
                  }
                ]
              }
            ]
          }
        ]
      };

      const id = await api.Save({
        content: JSON.stringify(pipeline),
        keepHistoryCount: 30
      });
      message.success("创建成功,请添加证书部署任务");
      router.push({ path: "/certd/pipeline/detail", query: { id, editMode: "true" } });
    });
  }
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
          type: "text",
          search: {
            show: true,
            component: {
              name: "a-input"
            }
          },
          column: {
            width: 300
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
              { value: true, label: "禁用" },
              { value: false, label: "启用" }
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
