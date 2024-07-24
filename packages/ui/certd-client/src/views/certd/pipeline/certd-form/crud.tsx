import { compute, CreateCrudOptionsRet, dict } from "@fast-crud/fast-crud";
import { PluginGroup } from "@certd/pipeline";
import { useReference } from "/@/use/use-refrence";
import _ from "lodash-es";

export default function (certPluginGroup: PluginGroup, formWrapperRef: any): CreateCrudOptionsRet {
  const inputs: any = {};

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
            console.log(formWrapperRef);
            const form = formWrapperRef.value.getFormData();
            if (!form) {
              return false;
            }
            return form?.certApplyPlugin === plugin.name;
          })
        }
      };
    }
  }

  return {
    crudOptions: {
      form: {
        wrapper: {
          width: "1150px",
          saveRemind: false
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
                    <li>Lego-ACME：基于Lego实现，支持海量DNS提供商</li>
                    <li>JS-ACME：如果你的域名DNS属于阿里云、腾讯云、Cloudflare可以选择用它来申请</li>
                  </ul>
                );
              }
            }
          }
        },
        ...inputs,
        triggerCron: {
          title: "定时触发",
          type: "text",
          form: {
            component: {
              placeholder: "0 0 4 * * *"
            },
            helper: "请输入cron表达式, 例如：0 0 4 * * *，每天凌晨4点触发",
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
                return (
                  <div>
                    需要配置<router-link to={{ path: "/certd/settings/email" }}>邮件服务器</router-link>才能发送邮件
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
