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
          title: "Invitation Time",
          type: "datetime",
          column: { width: 180 },
        },
        simpleUser: {
          title: "Invited Username",
          type: "text",
          column: {
            minWidth: 180,
            cellRender({ row }) {
              const simpleUser = row.simpleUser;
              if (!simpleUser) {
                return row.inviteeUserId ? `User  (${row.inviteeUserId})` : "-";
              }
              return simpleUser.displayName || `${simpleUser.username || "-"} (${simpleUser.id})`;
            },
          },
        },
        inviteCode: {
          title: "Invitation Code",
          type: "text",
          column: { width: 160 },
        },
      },
    },
  };
}
