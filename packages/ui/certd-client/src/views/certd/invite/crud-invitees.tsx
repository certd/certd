import { CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetInvitees(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      search: { show: false },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        inviteeUserId: {
          title: "被推广用户ID",
          type: "number",
          column: { width: 140 },
        },
        inviteCode: {
          title: "推广码",
          type: "text",
          column: { width: 160 },
        },
        createTime: {
          title: "推广时间",
          type: "datetime",
          column: { width: 180 },
        },
      },
    },
  };
}
