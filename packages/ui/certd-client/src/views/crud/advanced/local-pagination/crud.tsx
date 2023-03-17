import * as api from "./api.js";
import _ from "lodash-es";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const localDataRef = context.localDataRef;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    const { page } = query;
    //总数据
    let data = localDataRef.value;
    //获取请求参数
    const limit = page.limit;
    const offset = page.offset;
    data = data.filter((item: any) => {
      // 根据你的业务，编写你的本地查询逻辑
      // text改成你的查询字段
      if (query.status && item.status !== query.status) {
        return false;
      }
      return true;
    });

    // 本地分页
    const start = offset;
    let end = offset + limit;
    if (data.length < end) {
      end = data.length;
    }
    const records = data.slice(start, end);

    // 构造返回结果
    return {
      offset,
      limit,
      total: localDataRef.value.length,
      records
    };
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    await api.UpdateObj(form);
    //更新本地数据
    const tableData = localDataRef.value;
    for (const item of tableData) {
      if (item.id === form.id) {
        _.merge(item, form);
      }
    }
  };

  const addRequest = async ({ form }: AddReq) => {
    const id = await api.AddObj(form);
    //本地添加
    form.id = id;
    localDataRef.value.unshift(form);
    return id;
  };

  const delRequest = async ({ row }: DelReq) => {
    await api.DelObj(row.id);
    //本地删除那一条记录
    const tableData = localDataRef.value;
    let index = 0;
    for (const item of tableData) {
      if (item.id === row.id) {
        localDataRef.value.splice(index, 1);
      }
      index++;
    }
  };

  return {
    output: {},
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
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        status: {
          title: "状态",
          search: { show: true },
          type: "dict-select",
          dict: dict({
            url: "/mock/dicts/OpenStatusEnum?single"
          })
        }
      }
    }
  };
}
