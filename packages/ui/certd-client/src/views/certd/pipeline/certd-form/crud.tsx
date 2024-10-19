import { compute, CreateCrudOptionsRet, dict } from "@fast-crud/fast-crud";
import { PluginGroup } from "@certd/pipeline";
import { useReference } from "/@/use/use-refrence";
import _, { merge } from "lodash-es";
import { useUserStore } from "/@/store/modules/user";
import { useSettingStore } from "/@/store/modules/settings";
import * as api from "../api.plugin";
export default function (certPluginGroup: PluginGroup, formWrapperRef: any): CreateCrudOptionsRet {
  const inputs: any = {};
  const userStore = useUserStore();
  const settingStore = useSettingStore();
  for (const plugin of certPluginGroup.plugins) {
    for (const inputKey in plugin.input) {
      if (inputs[inputKey]) {
        inputs[inputKey].form.show = true;
        continue;
      }
      const inputDefine = _.cloneDeep(plugin.input[inputKey]);
      if (!inputDefine.required && !inputDefine.maybeNeed) {
        continue;
      }
      useReference(inputDefine);
      inputs[inputKey] = {
        title: inputDefine.title,
        form: {
          ...inputDefine,
          show: compute((ctx) => {
            const form = formWrapperRef.value.getFormData();
            if (!form) {
              return false;
            }

            let inputDefineShow = true;
            if (inputDefine.show != null) {
              const computeShow = inputDefine.show as any;
              inputDefineShow = computeShow.computeFn({ form });
            }
            return form?.certApplyPlugin === plugin.name && inputDefineShow;
          })
        }
      };
    }
  }

  return {
    crudOptions: {
      form: {
        wrapper: {
          width: 1350,
          saveRemind: false,
          title: "创建证书申请流水线"
        }
      },
      columns: {
        certApplyPlugin: {
          title: "证书申请插件",
          type: "dict-select",
          dict: dict({
            data: [
              { value: "CertApply", label: "JS-ACME" },
              { value: "CertApplyLego", label: "Lego-ACME" }
            ]
          }),
          form: {
            order: 0,
            value: "CertApply",
            helper: {
              render: () => {
                return (
                  <ul>
                    <li>JS-ACME：使用简单方便，功能强大【推荐】</li>
                    <li>Lego-ACME：基于Lego实现，支持海量DNS提供商，熟悉LEGO的用户可以使用</li>
                  </ul>
                );
              }
            },
            valueChange: {
              handle: async ({ form, value }) => {
                const config = await api.GetPluginConfig({
                  name: value,
                  type: "builtIn"
                });
                if (config.sysSetting?.input) {
                  merge(form, config.sysSetting.input);
                }
              },
              immediate: true
            }
          }
        },
        ...inputs,
        triggerCron: {
          title: "定时触发",
          type: "text",
          form: {
            component: {
              name: "cron-editor",
              vModel: "modelValue",
              placeholder: "0 0 4 * * *"
            },
            helper:
              "点击上面的按钮，选择每天几点几分定时执行,后面的分秒都要选择0。\n例如：0 0 4 * * *，每天凌晨4点0分0秒触发\n建议设置为每天触发一次，证书未到期之前任务会跳过，不会重复执行",
            order: 100
          }
        },
        emailNotify: {
          title: "失败邮件通知",
          type: "dict-switch",
          dict: dict({
            data: [
              { value: true, label: "启用" },
              { value: false, label: "不启用" }
            ]
          }),
          form: {
            order: 101,
            helper: {
              render: () => {
                if (settingStore.isPlus) {
                  return "";
                }
                return (
                  <div>
                    需要配置<router-link to={{ path: "/sys/settings/email" }}>邮件服务器</router-link>才能发送邮件(专业版请忽略)
                  </div>
                );
              }
            }
          }
        }
      }
    }
  };
}
