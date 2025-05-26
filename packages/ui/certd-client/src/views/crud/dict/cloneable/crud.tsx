import * as api from "./api";
import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes, ValueChangeContext } from "@fast-crud/fast-crud";
import { createUploaderRules } from "@fast-crud/fast-extends";
export default async function createCrudOptions({}: CreateCrudOptionsProps): Promise<CreateCrudOptionsRet> {
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
        localSet: {
          title: "本地修改",
          search: { show: true },
          dict: dict({
            cloneable: true,
            data: [
              {
                value: 1,
                label: "本地字典"
              }
            ]
          }),
          type: "dict-select"
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
              const targetDict = getComponentRef("remote").getDict();
              targetDict.url = row.modifyDict ? "/mock/dicts/moreOpenStatusEnum?remote" : "/mock/dicts/OpenStatusEnum?remote";
              targetDict.reloadDict();

              const targetDict2 = getComponentRef("localSet").getDict();
              if (row.modifyDict) {
                targetDict2.setData([{ value: 1, label: "修改后的字典" }]);
              } else {
                targetDict2.setData([{ value: 1, label: "原字典" }]);
              }
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
              const targetDict = getComponentRef("remote").getDict();
              targetDict.url = form.modifyDict ? "/mock/dicts/moreOpenStatusEnum?remote" : "/mock/dicts/OpenStatusEnum?remote";
              targetDict.reloadDict();

              const targetDict2 = getComponentRef("localSet").getDict();
              if (form.modifyDict) {
                targetDict2.setData([{ value: 1, label: "修改后的字典" }]);
              } else {
                targetDict2.setData([{ value: 1, label: "原字典" }]);
              }
            }
          }
        },
        pictureCard: {
          title: "照片墙",
          type: "image-uploader"
        }
      }
    }
  };
}
