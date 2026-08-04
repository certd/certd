import { CreateCrudOptionsProps, CreateCrudOptionsRet, importTable } from "@fast-crud/fast-crud";
import { Modal, notification } from "ant-design-vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  return {
    crudOptions: {
      mode: {
        name: "local",
        isMergeWhenUpdate: true,
        isAppendWhenAdd: true,
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
            show: false,
            text: "Batch import",
            type: "primary",
            click() {
              const modal = Modal.info({
                title: "Batch import",
                okText: "Close",
                content() {
                  async function onChange(e: any) {
                    const file = e.target.files[0];
                    await importTable(crudExpose, { file, append: true });
                    modal.destroy();
                    notification.success({
                      message: "Import succeeded",
                    });
                  }
                  return (
                    <div>
                      <p>
                        1、<a href={"template-import.csv"}>Download import template</a>
                      </p>
                      <p>
                        2、<span>Fill template data</span>
                      </p>
                      <p>
                        <span>3. Import:</span>
                        <input type={"file"} onInput={onChange}></input>
                      </p>
                    </div>
                  );
                },
              });
            },
          },
        },
      },
      table: {
        remove: {
          //删除数据后不请求后台
          refreshTable: false,
        },
        editable: {
          enabled: true,
          mode: "row",
          activeTrigger: false,
        },
      },
      search: {
        show: false,
      },
      toolbar: {
        show: false,
      },
      pagination: {
        show: false,
      },
      columns: {},
    },
  };
}
