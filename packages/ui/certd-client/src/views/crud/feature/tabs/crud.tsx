import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };
  const statusRef = dict({
    url: "/mock/dicts/OpenStatusEnum?single"
  });
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      search: {
        autoSearch: false,
        initialForm: {
          radio: null
        },
        buttons: {
          custom: {
            text: "自定义",
            show: true,
            order: 3,
            icon: {
              icon: "ant-design:search",
              style: {
                "font-size": "16px"
              }
            },
            click() {
              console.log("点击了自定义按钮");
            }
          }
        }
      },
      tabs: {
        name: "radio",
        show: true
        //type: 'card', //tabs类型
        // defaultOption: { //第一个tab页签显示
        //   show: true,
        //   value: null, //点击第一个页签，查询值
        //   label: '全部', // 第一个页签的名称
        // },
        // options: computed(() => { //选项，默认从name字段的dict里面获取
        //   return statusRef.data;
        // })
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
        radio: {
          title: "状态",
          search: { show: true },
          type: "dict-radio",
          dict: statusRef
        },
        text: {
          title: "文本",
          search: { show: true },
          type: "text"
        }
      }
    }
  };
}
