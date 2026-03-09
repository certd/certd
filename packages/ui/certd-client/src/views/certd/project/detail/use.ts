import { dict } from "@fast-crud/fast-crud";
import { useDicts } from "../../dicts";
import { useFormDialog } from "/@/use/use-dialog";

export function useApprove() {
  const { openFormDialog } = useFormDialog();
  const { projectPermissionDict, projectMemberStatusDict, userDict } = useDicts();
  function openApproveDialog({ id, permission, onSubmit }: { id: any; permission: any; onSubmit: any }) {
    openFormDialog({
      title: "审批加入申请",
      columns: {
        permission: {
          title: "成员权限",
          type: "dict-select",
          dict: projectPermissionDict,
        },
        status: {
          title: "审批结果",
          type: "dict-radio",
          dict: dict({
            data: [
              {
                label: "通过",
                value: "approved",
              },
              {
                label: "拒绝",
                value: "rejected",
              },
            ],
          }),
        },
      },
      onSubmit: onSubmit,
      initialForm: {
        id: id,
        permission: permission,
        status: "approved",
      },
    });
  }

  return {
    openApproveDialog,
  };
}
