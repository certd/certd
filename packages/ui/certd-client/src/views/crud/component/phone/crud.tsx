import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, ScopeContext, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { SearchOutlined } from "@ant-design/icons-vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          form: { show: false }
        },
        phone: {
          title: "手机号码",
          type: "phone",
          search: { show: true }
        },
        phoneNumber: {
          title: "区号手机号分开",
          type: "phone",
          valueBuilder({ row, key, value }) {
            row[key] = {
              callingCode: row.code || undefined,
              phoneNumber: value || ""
            };
          },
          valueResolve({ form, key, value }) {
            if (value) {
              form.code = value.callingCode;
              form.phoneNumber = value.phoneNumber;
            }
          }
        },
        only: {
          title: "仅某些国家",
          type: "phone",
          form: {
            component: {
              onlyCountries: ["CN", "US"]
            },
            helper: "仅CN,US"
          }
        },
        ignore: {
          title: "排除某些国家",
          type: "phone",
          form: {
            component: {
              ignoredCountries: ["jp"]
            },
            helper: "排除JP"
          }
        },
        priority: {
          title: "优先某些国家",
          type: "phone",
          form: {
            component: {
              priorityCountries: ["CN", "US"],
              ignoredCountries: ["jp"]
            },
            helper: "优先CN，US，排除JP"
          }
        }
      }
    }
  };
}
