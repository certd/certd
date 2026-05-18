import { CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";

export default function (): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetInvitees(query);
  };

  return {
    crudOptions: {
      request: { pageRequest },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: { show: false },
      columns: {
        inviteeUserId: {
          title: "被邀请人ID",
          type: "number",
          column: { width: 140 },
        },
        inviteCode: {
          title: "邀请码",
          type: "text",
          column: { width: 160 },
        },
        createTime: {
          title: "邀请时间",
          type: "datetime",
          column: { width: 180 },
        },
      },
    },
  };
}
