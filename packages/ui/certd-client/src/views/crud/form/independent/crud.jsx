export default function ({ expose }) {
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
