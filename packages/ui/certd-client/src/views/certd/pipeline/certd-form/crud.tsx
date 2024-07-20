import { compute, CreateCrudOptionsRet, dict } from "@fast-crud/fast-crud";
import { PluginGroup } from "@certd/pipeline";

export default function (certPluginGroup: PluginGroup, formWrapperRef: any): CreateCrudOptionsRet {
  const inputs: any = {};

  for (const plugin of certPluginGroup.plugins) {
    for (const inputKey in plugin.input) {
      if (inputs[inputKey]) {
        inputs[inputKey].form.show = true;
        continue;
      }
      const inputDefine = plugin.input[inputKey];
      if (!inputDefine.required && !inputDefine.maybeNeed) {
        continue;
      }
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

  console.log(inputs);
  debugger;

  return {
    crudOptions: {
      form: {
        wrapper: {
          width: "1150px"
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
        ...inputs
      }
    }
  };
}
