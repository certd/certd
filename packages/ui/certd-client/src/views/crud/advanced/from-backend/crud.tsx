import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, dict } from "@fast-crud/fast-crud";
import { GetCrud } from "./api";
import _ from "lodash-es";

/**
 * 异步创建options
 * @param props
 */
export default async function (props: CreateCrudOptionsProps): Promise<CreateCrudOptionsRet> {
  const { crudExpose } = props;
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

  const localCrudOptions = {
    request: {
      pageRequest,
      addRequest,
      editRequest,
      delRequest
    }
  };
  // 上面是本地crudOptions

  // 下面从后台获取crudOptions
  const ret = await GetCrud();
  // 编译
  const crudBackend = eval(ret);
  // 本示例返回的是一个方法字符串，所以要先执行这个方法，获取options
  const remoteCrudOptions = crudBackend({ crudExpose, dict });
  // 与本地options合并
  const crudOptions = _.merge(localCrudOptions, remoteCrudOptions);

  return {
    crudOptions
  };
}
