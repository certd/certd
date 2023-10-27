import { usePermission } from "/@/plugin/permission";
import _ from "lodash-es";

export type UseCrudPermissionExtraProps = {
  hasActionPermission: (action: string) => boolean;
};
export type UseCrudPermissionExtra = (props: UseCrudPermissionExtraProps) => any;
export type UseCrudPermissionCompProps = {
  prefix: string;
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

  const prefix = permission instanceof Object ? permission.prefix : permission;

  //根据权限显示按钮
  function hasActionPermission(action: string) {
    if (!prefix) {
      return true;
    }
    return hasPermissions(prefix + ":" + action);
  }

  function buildCrudPermission() {
    if (permission == null) {
      return {};
    }

    let extra = {};
    if (permission instanceof Object) {
      extra = permission.extra;
      if (permission.extra && permission.extra instanceof Function) {
        extra = permission.extra({ hasActionPermission });
      }
    }

    return _.merge(
      {
        actionbar: {
          buttons: {
            add: { show: hasActionPermission("add") }
          }
        },
        rowHandle: {
          buttons: {
            edit: { show: hasActionPermission("edit") },
            remove: { show: hasActionPermission("remove") },
            view: { show: hasActionPermission("view") }
          }
        }
      },
      extra
    );
  }

  function merge(userOptions: any) {
    const permissionOptions = buildCrudPermission();
    _.merge(permissionOptions, userOptions);
    return permissionOptions;
  }

  return { merge, buildCrudPermission, hasActionPermission };
}
