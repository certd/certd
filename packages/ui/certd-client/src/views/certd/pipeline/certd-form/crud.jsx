import { compute } from "@fast-crud/fast-crud";
import { Dicts } from "./dicts";

export default function () {
  return {
    crudOptions: {
      form: {
        wrapper: {
          width: "1150px"
        }
      },
      columns: {
        domains: {
          title: "域名",
          type: ["dict-select"],
          search: {
            show: true,
            component: {
              name: "a-input"
            }
          },
          form: {
            col: {
              span: 24
            },
            wrapperCol: {
              span: null
            },
            component: {
              mode: "tags",
              open: false
            },
            helper: {
              render: () => {
                return (
                  <div>
                    <div>支持通配符域名，例如： *.foo.com 、 *.test.handsfree.work</div>
                    <div>支持多个域名、多个子域名、多个通配符域名打到一个证书上（域名必须是在同一个DNS提供商解析）</div>
                    <div>多级子域名要分成多个域名输入（*.foo.com的证书不能用于xxx.yyy.foo.com）</div>
                    <div>输入一个回车之后，再输入下一个</div>
                  </div>
                );
              }
            },
            valueResolve({ form }) {
              if (form.domains instanceof String) {
                form.domains = form.domains?.join(",");
              }
            },
            rules: [{ required: true, message: "请填写域名" }]
          }
        },
        email: {
          title: "邮箱",
          type: "text",
          search: { show: false },
          form: {
            rules: [{ required: true, type: "email", message: "请填写邮箱" }]
          }
        },
        dnsProviderType: {
          title: "DNS提供商",
          type: "dict-select",
          dict: Dicts.dnsProviderTypeDict,
          form: {
            value: "aliyun",
            rules: [{ required: true, message: "请选择DNS提供商" }],
            valueChange({ form }) {
              form.dnsProviderAccess = null;
            }
          }
        },
        dnsProviderAccess: {
          title: "DNS授权",
          type: "text",
          form: {
            component: {
              name: "PiAccessSelector",
              type: compute(({ form }) => {
                return form.dnsProviderType;
              }),
              vModel: "modelValue"
            },
            rules: [{ required: true, message: "请选择DNS授权" }]
          }
        }
        // country: {
        //   title: "国家",
        //   type: "text",
        //   form: {
        //     value: "China"
        //   }
        // },
        // state: {
        //   title: "省份",
        //   type: "text",
        //   form: {
        //     value: "GuangDong"
        //   }
        // },
        // locality: {
        //   title: "市区",
        //   type: "text",
        //   form: {
        //     value: "NanShan"
        //   }
        // },
        // organization: {
        //   title: "单位",
        //   type: "text",
        //   form: {
        //     value: "CertD"
        //   }
        // },
        // organizationUnit: {
        //   title: "部门",
        //   type: "text",
        //   form: {
        //     value: "IT Dept"
        //   }
        // },
        // remark: {
        //   title: "备注",
        //   type: "text"
        // }
      }
    }
  };
}
