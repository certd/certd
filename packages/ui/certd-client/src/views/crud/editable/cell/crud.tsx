import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditableEachCellsOpts, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { reactive, ref } from "vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };

  const radioDictRef = dict({
    url: "/mock/dicts/OpenStatusEnum?single"
  });

  const radioColumnValue = ref("");
  function columnUpdate(event: Event) {
    //批量设置值
    // _.forEach(crudBinding.value?.data, (item) => {
    //   item.radio = event.target.value;
    // });
    crudExpose.editable.eachCells((opts: EditableEachCellsOpts) => {
      const { key, cell, rowData } = opts;
      if (key === "radio") {
        if (cell.isEditing) {
          //@ts-ignore
          rowData.radio = event.target.value;
        }
      }
    });
  }
  const radioColumnEditor = reactive({
    editing: false,
    loading: false,
    onSubmit: async () => {
      radioColumnEditor.loading = true;
      try {
        const data: any[] = [];
        for (const row of crudBinding.value.data) {
          data.push({ id: row.id, radio: row.radio });
        }
        await api.UpdateColumn(data);
        crudExpose.editable.persist();
        radioColumnEditor.editing = false;
      } finally {
        radioColumnEditor.loading = false;
      }
    },
    onCancel: () => {
      crudExpose.editable.cancel();
      radioColumnEditor.editing = false;
    },
    "onUpdate:editing": (value: boolean) => {
      radioColumnEditor.editing = value;
      if (value === true) {
        crudExpose.editable.activeCols({ cols: ["radio"], showAction: false });
      }
    },
    vSlots: {
      edit: () => {
        return <fs-dict-radio dict={radioDictRef} v-model:value={radioColumnValue.value} onChange={columnUpdate}></fs-dict-radio>;
      }
    }
  });

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
          // add: {
          //   show: computed(() => {
          //     if (crudBinding.value) {
          //       return !crudBinding.value?.table.editable.enabled;
          //     }
          //     return false;
          //   })
          // },
          // addRow: {
          //   show: computed(() => {
          //     if (crudBinding.value) {
          //       return crudBinding.value?.table.editable.enabled;
          //     }
          //     return false;
          //   })
          // }
        }
      },
      table: {
        editable: {
          mode: "cell",
          exclusive: true,
          //排他式激活效果，将其他行的编辑状态触发保存
          exclusiveEffect: "save", //自动保存其他行编辑状态，cancel = 自动关闭其他行编辑状态
          async updateCell(opts) {
            const { row, key, value } = opts;
            //如果是添加，需要返回{[rowKey]:xxx},比如:{id:2}
            return await api.UpdateCell(row.id, key, value);
          }
        },
        slots: {
          //编辑列
          headerCell({ column }: any) {
            if (column.key === "radio") {
              return (
                <div style={{ width: "100%" }} class={"flex "}>
                  <fs-editable {...radioColumnEditor} v-slots={radioColumnEditor.vSlots}>
                    {column.title} <span style={{ color: "red" }}>(点我批量编辑)</span>
                  </fs-editable>
                </div>
              );
            }
          }
        }
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: {
            show: false
          },
          column: { width: 80, align: "center" }
        },
        disable: {
          title: "禁止编辑",
          type: "text",
          column: {
            editable: {
              disabled: true //也可以配置为方法，根据条件禁用或启用编辑
              // disabled: ({ column, index, row }) => {
              //   return index % 2 === 0;
              // }
            }
          }
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: radioDictRef,
          column: {
            width: 300,
            valueChange({ value, getComponentRef }) {
              console.log("value changed:", value, getComponentRef("radio"));
            },
            editable: {
              async updateCell(opts) {
                const { row, key, value } = opts;
                //如果是添加，需要返回{[rowKey]:xxx},比如:{id:2}
                await api.UpdateCell(row.id, key, value);
                //同时修改 updateCellLink
                await api.UpdateCell(row.id, "updateCellLink", value);
                //修改联动本地列
                row.updateCellLink = value;
              }
            }
          }
        },
        updateCellLink: {
          title: "状态联动",
          type: "text",
          column: {
            editable: {
              disabled: true
            }
          }
        },
        name: {
          title: "姓名",
          type: "text",
          form: {
            rules: [
              { required: true, message: "请输入姓名" },
              {
                type: "string",
                min: 2,
                max: 10,
                message: "长度在 2 到 10 个字符"
              }
            ]
          }
        },
        address: {
          title: "地址",
          children: {
            province: {
              title: "省份",
              search: { show: true },
              type: "text"
            },
            city: {
              title: "城市",
              search: { show: true },
              type: "dict-select",
              dict: dict({
                value: "id",
                label: "text",
                data: [
                  { id: "sz", text: "深圳", color: "success" },
                  { id: "gz", text: "广州", color: "primary" },
                  { id: "bj", text: "北京" },
                  { id: "wh", text: "武汉" },
                  { id: "sh", text: "上海" }
                ]
              })
            }
          }
        }
      }
    }
  };
}
