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
        createTime: {
          title: "邀请时间",
          type: "datetime",
          column: { width: 180 },
        },
        simpleUser: {
          title: "被邀请用户名",
          type: "text",
          column: {
            minWidth: 180,
            cellRender({ row }) {
              const simpleUser = row.simpleUser;
              if (!simpleUser) {
                return row.inviteeUserId ? `用户${row.inviteeUserId} (${row.inviteeUserId})` : "-";
              }
              return simpleUser.displayName || `${simpleUser.username || "-"} (${simpleUser.id})`;
            },
          },
        },
        inviteCode: {
          title: "邀请码",
          type: "text",
          column: { width: 160 },
        },
      },
    },
  };
}
