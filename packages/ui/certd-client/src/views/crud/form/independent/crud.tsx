import { message } from "ant-design-vue";
import { CreateCrudOptionsProps, CreateCrudOptionsRet } from "@fast-crud/fast-crud";

export default function ({}: CreateCrudOptionsProps): CreateCrudOptionsRet {
  return {
    crudOptions: {
      form: {
        wrapper: {
          onClosed(e) {
            console.log("onClosed", e);
          },
          onOpened(e) {
            console.log("onOpened", e);
          }
        },
        doSubmit({ form }) {
          //覆盖提交方法
          console.log("form submit:", form);
          message.info("自定义表单提交:" + JSON.stringify(form));
          message.warn("抛出异常可以阻止表单关闭");
          throw new Error("抛出异常可以阻止表单关闭");
        },
        labelCol: { span: 6 },
        wrapperCol: { span: 16 },
        helper: {
          // position: "label" // helper的展示位置全局配置
          // tooltip:{}
        }
      },
      columns: {
        name: {
          title: "最简单",
          type: "text",
          form: {
            helper: "最简单的helper"
          }
        },
        age: {
          title: "jsx",
          type: "text",
          form: {
            helper: {
              render() {
                return <div style={"color:blue"}>jsx自定义render</div>;
              }
            }
          }
        },
        status: {
          title: "显示在label",
          type: "text",
          form: {
            rules: [{ required: true, message: "此项必填" }],
            helper: {
              position: "label",
              tooltip: {
                placement: "topLeft"
              },
              text: "在label通过tooltip方式显示的helper"
              // render() {
              //   return <div style={"color:red"}>在label通过tooltip方式显示的helper</div>;
              // }
            }
          }
        }
      }
    }
  };
}
