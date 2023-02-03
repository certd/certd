import * as api from "/@/views/certd/access/api";
import { ref } from "vue";
import { getCommonColumnDefine } from "/@/views/certd/access/common";

export default function ({ expose, props, ctx }) {
  const { crudBinding } = expose;
  const lastResRef = ref();
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    form.type = props.type;
    const res = await api.UpdateObj(form);
    lastResRef.value = res;
    return res;
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }) => {
    form.type = props.type;
    const res = await api.AddObj(form);
    lastResRef.value = res;
    return res;
  };

  const selectedRowKey = ref([props.modelValue]);
  // watch(
  //   () => {
  //     return props.modelValue;
  //   },
  //   (value) => {
  //     selectedRowKey.value = [value];
  //   },
  //   {
  //     immediate: true
  //   }
  // );
  const onSelectChange = (changed) => {
    selectedRowKey.value = changed;
    ctx.emit("update:modelValue", changed[0]);
  };

  const typeRef = ref("aliyun");
  const commonColumnsDefine = getCommonColumnDefine(crudBinding, typeRef);
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
        width: "150px"
      },
      table: {
        rowSelection: {
          type: "radio",
          selectedRowKeys: selectedRowKey,
          onChange: onSelectChange
        },
        customRow: (record) => {
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
          }
        },
        ...commonColumnsDefine
      }
    }
  };
}
