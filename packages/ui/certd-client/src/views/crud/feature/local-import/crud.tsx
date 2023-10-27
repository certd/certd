import { CreateCrudOptionsProps, CreateCrudOptionsRet, importTable } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const crudBinding = crudExpose.crudBinding;
  return {
    crudOptions: {
      mode: {
        name: "local",
        isMergeWhenUpdate: true,
        isAppendWhenAdd: true
      },
      //启用addRow按钮
      actionbar: {
        buttons: {
          //禁用弹框添加
          add: { show: false },
          //启用添加行
          addRow: { show: true },
          //导入按钮
          import: {
            show: true,
            text: "批量导入",
            type: "primary",
            click() {
              const modal = Modal.info({
                title: "批量导入",
                okText: "关闭",
                content() {
                  async function onChange(e: any) {
                    const file = e.target.files[0];
                    await importTable(crudExpose, { file, append: true });
                    modal.destroy();
                    notification.success({
                      message: "导入成功"
                    });
                  }
                  return (
                    <div>
                      <p>
                        1、<a href={"template-import.csv"}>下载导入模板</a>
                      </p>
                      <p>
                        2、<span>模板填充数据</span>
                      </p>
                      <p>
                        <span>3、导入：</span>
                        <input type={"file"} onInput={onChange}></input>
                      </p>
                    </div>
                  );
                }
              });
            }
          }
        }
      },
      table: {
        remove: {
          //删除数据后不请求后台
          refreshTable: false
        },
        editable: {
          enabled: true,
          mode: "row",
          activeTrigger: false
        }
      },
      search: {
        show: false
      },
      toolbar: {
        show: false
      },
      pagination: {
        show: false
      },
      columns: {
        name: {
          type: "text",
          title: "联系人姓名"
        },
        mobile: {
          type: "text",
          title: "联系人手机号码"
        }
      }
    }
  };
}
