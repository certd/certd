import * as api from "./api";
import { dict } from "@fast-crud/fast-crud";
export default function ({ expose }) {
  const pageRequest = async (query) => {
    return await api.GetList(query);
  };
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

  /**
   * 列合并render
   */
  function colMergeRender({ index }) {
    return {
      props: {
        colSpan: 5
      }
    };
  }
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      table: {
        slots: {
          summary() {
            return <div>总结栏</div>;
          }
        }
      },
      columns: {
        id: {
          title: "id",
          type: "text"
        },
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        },
        cellMerge: {
          title: "上下合并",
          column: {
            customRender: ({ text, index }, cellRender) => {
              const obj = {
                props: {}
              };
              if (index === 2) {
                obj.children = text + "(我合并了)";
                obj.props.rowSpan = 2;
              } else if (index === 3) {
                obj.props.rowSpan = 0;
              } else {
                obj.children = cellRender();
              }
              return obj;
            }
          }
        },
        colMerge1: {
          title: "左右合并",
          column: {
            align: "center",
            customRender({ text, index, record, dataIndex }, cellRender) {
              if (index !== 4) {
                return {
                  children: cellRender()
                };
              }
              return {
                children: text + "(我合并了)",
                props: {
                  colSpan: 2
                }
              };
            }
          }
        },
        colMerge2: {
          title: "左右合并",
          column: {
            customRender({ text, index, record, dataIndex }, cellRender) {
              if (index !== 4) {
                return {
                  children: cellRender()
                };
              }
              return {
                props: {
                  colSpan: 0
                }
              };
            }
          }
        },
        header1: {
          title: "表头合并(我合并了)",
          type: "text",
          column: {
            colSpan: 2
          }
        },
        header2: {
          title: "表头合并",
          type: "text",
          column: {
            colSpan: 0
          }
        }
      }
    }
  };
}
