import { CreateCrudOptionsProps, CreateCrudOptionsRet, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import * as api from "./api";
import { useI18n } from "/src/locales";

export default function (): CreateCrudOptionsRet {
  const { t } = useI18n();
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
          title: t("certd.suite.inviteTime"),
          type: "datetime",
          column: { width: 180 },
        },
        simpleUser: {
          title: t("certd.suite.inviteeUsername"),
          type: "text",
          column: {
            minWidth: 180,
            cellRender({ row }) {
              const simpleUser = row.simpleUser;
              if (!simpleUser) {
                return row.inviteeUserId ? `${t("certd.common.usera")}${row.inviteeUserId} (${row.inviteeUserId})` : "-";
              }
              return simpleUser.displayName || `${simpleUser.username || "-"} (${simpleUser.id})`;
            },
          },
        },
        inviteCode: {
          title: t("certd.suite.inviteCode"),
          type: "text",
          column: { width: 160 },
        },
      },
    },
  };
}
