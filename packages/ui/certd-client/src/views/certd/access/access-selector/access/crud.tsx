// @ts-ignore
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  const { props, ctx, api } = context;
  const lastResRef = ref();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await context.api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    form.type = props.type;
    const res = await context.api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await context.api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    form.type = props.type;
    const res = await context.api.AddObj(form);
    lastResRef.value = res;
    return res;
  };

  const selectedRowKey = ref([props.modelValue]);

  const onSelectChange = (changed: any) => {
    selectedRowKey.value = changed;
    ctx.emit("update:modelValue", changed[0]);
  };

  const typeRef = ref("aliyun");
  context.typeRef = typeRef;
  const commonColumnsDefine = getCommonColumnDefine(crudExpose, typeRef, api);
  commonColumnsDefine.type.form.component.disabled = true;
  return {
    typeRef,
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      toolbar: {
        show: false
      },
      search: {
        show: false
      },
      form: {
        wrapper: {
          width: "1050px"
        }
      },
      rowHandle: {
        width: 200
      },
      table: {
        scroll: {
          x: 800
        },
        rowSelection: {
          type: "radio",
          selectedRowKeys: selectedRowKey,
          onChange: onSelectChange
        },
        customRow: (record: any) => {
          return {
            onClick: () => {
              onSelectChange([record.id]);
            } // 点击行
          };
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
        name: {
          title: "名称",
          search: {
            show: true
          },
          type: ["text"],
          form: {
            rules: [{ required: true, message: "请填写名称" }],
            helper: "随便填，当多个相同类型的授权时，便于区分"
          },
          column: {
            width: 200
          }
        },
        from: {
          title: "级别",
          type: "dict-select",
          dict: dict({
            data: [
              { label: "系统", value: "sys" },
              { label: "用户", value: "user" }
            ]
          }),
          search: {
            show: false
          },
          form: {
            show: false
          },
          column: {
            width: 100,
            align: "center",
            component: {
              color: "auto"
            },
            order: 10
          },
          valueBuilder: ({ row, key, value }) => {
            row[key] = row.userId > 0 ? "user" : "sys";
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
