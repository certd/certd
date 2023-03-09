import permissionUtil from "../util.permission";
export default {
  mounted(el: any, binding: any, vnode: any) {
    const { value } = binding;
    const hasPermission = permissionUtil.hasPermissions(value);

    if (!hasPermission) {
      el.parentNode && el.parentNode.removeChild(el);
    }
  }
};
