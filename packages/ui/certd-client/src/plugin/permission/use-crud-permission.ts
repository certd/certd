import { usePermission } from "/@/plugin/permission";
import { merge as LodashMerge } from "lodash-es";
import { useProjectStore } from "/@/store/project";

export type UseCrudPermissionExtraProps = {
  hasActionPermission: (action: string) => boolean;
};
export type UseCrudPermissionExtra = (props: UseCrudPermissionExtraProps) => any;
export type UseCrudPermissionCompProps = {
  isProjectPermission?: boolean;
  prefix?: string;
  extra?: UseCrudPermissionExtra;
  [key: string]: any;
};
export type UseCrudPermissionProps = {
  permission: string | UseCrudPermissionCompProps;
};
/**
 * 设置按钮动作权限
 * @param permission {prefix,extra}
 */
export function useCrudPermission({ permission }: UseCrudPermissionProps) {
  const { hasPermissions } = usePermission();

  //根据权限显示按钮
  let hasActionPermission = (action: string) => {
    if (!prefix) {
      return true;
    }
    return hasPermissions(prefix + ":" + action);
  };

  let per: UseCrudPermissionCompProps = permission as any;
  if (per == null) {
    per = { prefix: "" };
  }
  if (typeof per === "string") {
    per = {
      prefix: per || "",
    };
  }
  let prefix = per.prefix || "";
  const isProjectPermission = per.isProjectPermission || false;
  if (isProjectPermission) {
    const projectStore = useProjectStore();
    prefix = "";
    hasActionPermission = function (value: string) {
      return projectStore.hasPermission(value as string);
    };
  }

  function buildCrudPermission(): any {
    if (permission == null) {
      return {};
    }

    let extra = {};
    if (per instanceof Object) {
      extra = per.extra;
      if (per.extra && per.extra instanceof Function) {
        extra = per.extra({ hasActionPermission });
      }
    }

    let viewPermission = "view";
    if (isProjectPermission) {
      viewPermission = "read";
    }

    let addPermission = "add";
    if (isProjectPermission) {
      addPermission = "write";
    }

    let editPermission = "edit";
    if (isProjectPermission) {
      editPermission = "write";
    }

    let removePermission = "remove";
    if (isProjectPermission) {
      removePermission = "write";
    }
    return LodashMerge(
      {
        actionbar: {
          buttons: {
            add: { show: hasActionPermission(addPermission) },
          },
        },
        rowHandle: {
          buttons: {
            edit: { show: hasActionPermission(editPermission) },
            remove: { show: hasActionPermission(removePermission) },
            view: { show: hasActionPermission(viewPermission) },
          },
        },
      },
      extra
    );
  }

  function merge(userOptions: any) {
    const permissionOptions = buildCrudPermission();
    LodashMerge(permissionOptions, userOptions);
    return permissionOptions;
  }

  return { merge, buildCrudPermission, hasActionPermission };
}
