import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, ValueChangeContext } from "@fast-crud/fast-crud";
export default function createCrudOptions({}: CreateCrudOptionsProps): CreateCrudOptionsRet {
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

  const remoteDict = dict({
    cloneable: true,
    url: "/mock/dicts/OpenStatusEnum"
  });

  return {
    crudOptions: {
      remoteDict,
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
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
        remote: {
          title: "远程字典",
          search: { show: true },
          dict: remoteDict,
          type: "dict-select",
          form: {
            component: { dict: { cache: false } }
          }
        },
        modifyDict: {
          title: "动态修改字典",
          search: { show: false },
          type: "text",
          column: {
            component: {
              name: "a-switch",
              vModel: "checked"
            },
            valueChange({ row, getComponentRef }: ValueChangeContext) {
              // 这里不能使用remoteDict,因为在分发时已经clone到form配置中了
              // 这里dict修改不会影响列里面的数据
              const targetDict = getComponentRef("remote").dict;
              targetDict.url = row.modifyDict ? "/mock/dicts/moreOpenStatusEnum?remote" : "/mock/dicts/OpenStatusEnum?remote";
              targetDict.reloadDict();
            }
          },
          form: {
            component: {
              name: "a-switch",
              vModel: "checked"
            },
            valueChange({ form, getComponentRef }: ValueChangeContext) {
              // 这里不能使用remoteDict,因为在分发时已经clone到form配置中了
              // 这里dict修改不会影响列里面的数据
              const targetDict = getComponentRef("remote").dict;
              targetDict.url = form.modifyDict ? "/mock/dicts/moreOpenStatusEnum?remote" : "/mock/dicts/OpenStatusEnum?remote";
              targetDict.reloadDict();
            }
          }
        }
      }
    }
  };
}
