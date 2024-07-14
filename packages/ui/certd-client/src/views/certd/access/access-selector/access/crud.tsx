// @ts-ignore
import * as api from "/@/views/certd/access/api";
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { crudBinding } = crudExpose;
  const { props, ctx } = context;
  const lastResRef = ref();
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    form.type = props.type;
    const res = await api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    form.type = props.type;
    const res = await api.AddObj(form);
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
  const commonColumnsDefine = getCommonColumnDefine(crudExpose, typeRef);
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
        width: "130px"
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
            rules: [{ required: true, message: "请填写名称" }]
          },
          column: {
            width: 200
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
