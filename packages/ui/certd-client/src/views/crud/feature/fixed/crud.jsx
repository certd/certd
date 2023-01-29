import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
export default function ({ expose }) {
  const editRequest = async ({ form, row }) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }) => {
    return await api.DelObj(row.id);
  };
  const addRequest = async ({ form }) => {
    return await api.AddObj(form);
  };

  return {
    crudOptions: {
      request: {
        pageRequest: api.GetList,
        addRequest,
        editRequest,
        delRequest
      },
      rowHandle: {
        //固定右侧
        fixed: "right"
      },
      table: {
        scroll: {
          //当你表格宽度大到需要使用固定列时，需要设置此值，并且是大于等于列宽度之和的值
          //否则可能会出现将自动宽度列挤变形，或者拖动滚动条表头不动等问题。
          x: 1400
        }
      },
      columns: {
        text1: {
          title: "text1",
          type: "text",
          column: {
            // 固定左侧
            // 注意被固定在左侧的列要放在最前面，否则会出现某些列错位不显示的问题
            fixed: "left",
            width: 260
          }
        },
        id: {
          title: "id",
          type: "text",
          column: {
            width: 100
          }
        },
        text2: {
          title: "text2",
          type: "text",
          column: {
            width: 260
          }
        },
        text3: {
          title: "text3",
          type: "text",
          column: {
            width: 260
          }
        },
        text4: {
          title: "text4",
          type: "text",
          column: {
            width: 260
          }
        },
        text5: {
          title: "text5",
          type: "text",
          column: {
            width: 260
          }
        },
        last: {
          title: "last",
          type: "text",
          column: {
            width: 260
          }
        }
      }
    }
  };
}
