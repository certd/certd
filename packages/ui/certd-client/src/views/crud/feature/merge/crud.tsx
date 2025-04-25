import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
export default async function ({ crudExpose }: CreateCrudOptionsProps): Promise<CreateCrudOptionsRet> {
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

  /**
   * 列合并render
   */
  function colMergeRender({ index }: any) {
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
        //这里要减去总结栏的高度
        maxHeightAdjust: -39,
        slots: {
          summary() {
            return (
              <a-table-summary fixed>
                <a-table-summary-row>
                  <a-table-summary-cell index={0}>总结栏</a-table-summary-cell>
                  <a-table-summary-cell index={1}>这里是总结内容</a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            );
          }
        }
      },
      rowHandle: {
        fixed: null,
        title: "操作列行合并",
        customCell: (_: any, index: any) => {
          if (index === 4) {
            return { rowSpan: 2 };
          } else if (index === 5) {
            return { rowSpan: 0 };
          } else {
            return { rowSpan: 1 };
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
          type: "text",
          column: {
            customCell: (_: any, index: any) => {
              if (index === 2) {
                return {
                  rowSpan: 2
                };
              } else if (index === 3) {
                return {
                  rowSpan: 0
                };
              }
            },
            formatter({ value, index }) {
              if (index === 2) {
                return value + "（我上下合并了）";
              }
              return value;
            }
          }
        },
        colMerge1: {
          title: "左右合并1",
          type: "text",
          column: {
            align: "center",
            customCell(value: any, index: any) {
              if (index === 4) {
                return {
                  colSpan: 2
                };
              }
            },
            formatter({ value, index }) {
              if (index === 4) {
                return value + "（我左右合并了）";
              }
              return value;
            }
          }
        },
        colMerge2: {
          title: "左右合并2",
          type: "text",
          column: {
            customCell(_: any, index: any) {
              if (index === 4) {
                return {
                  colSpan: 0
                };
              }
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
