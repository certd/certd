<template>
  <fs-page>
    <template #header>
      <div class="title">角色管理</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
    <a-modal v-model:open="authzDialogVisible" width="860px" title="分配权限" @ok="updatePermission">
      <fs-permission-tree ref="permissionTreeRef" v-model:checkedKeys="checkedKeys" :tree="permissionTreeData" :editable="false" checkable :replace-fields="{ key: 'id', label: 'title' }"> </fs-permission-tree>
    </a-modal>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import * as permissionApi from "../permission/api";
import * as api from "./api";
import { message } from "ant-design-vue";
import FsPermissionTree from "../permission/fs-permission-tree.vue";
import { UseCrudPermissionCompProps, UseCrudPermissionExtraProps } from "/@/plugin/permission";

function useAuthz() {
  const checkedKeys = ref();

  const permissionTreeData = ref();

  const permissionTreeRef = ref();
  const authzDialogVisible = ref(false);

  const currentRoleId = ref();

  // 如果勾选节点中存在非叶子节点，tree组件会将其所有子节点全部勾选
  // 所以要找出所有叶子节点，仅勾选叶子节点，tree组件会将父节点同步勾选
  function getAllCheckedLeafNodeId(tree: any, checkedIds: any, temp: any) {
    for (let i = 0; i < tree.length; i++) {
      const item = tree[i];
      if (item.children && item.children.length !== 0) {
        getAllCheckedLeafNodeId(item.children, checkedIds, temp);
      } else {
        if (checkedIds.indexOf(item.id) !== -1) {
          temp.push(item.id);
        }
      }
    }
    return temp;
  }
  function authzClose() {
    authzDialogVisible.value = false;
  }
  async function authzOpen(roleId: any) {
    permissionTreeData.value = await permissionApi.GetTree();
    checkedKeys.value = [];
    currentRoleId.value = roleId;
    // this.treeData = ret.data
    await updateChecked(roleId);
    authzDialogVisible.value = true;
  }
  async function updateChecked(roleId: any) {
    let checkedIds = await api.getPermissionIds(roleId);
    // 找出所有的叶子节点
    checkedIds = getAllCheckedLeafNodeId(permissionTreeData.value, checkedIds, []);
    checkedKeys.value = checkedIds;
  }
  async function updatePermission() {
    const roleId = currentRoleId.value;
    const { checked, halfChecked } = permissionTreeRef.value.getChecked();
    const allChecked = [...checked, ...halfChecked];
    await api.DoAuthz(roleId, allChecked);
    authzClose();
    //await updateChecked(roleId);

    message.success("授权成功");
  }

  return {
    authzOpen,
    updatePermission,
    authzDialogVisible,
    permissionTreeData,
    checkedKeys,
    permissionTreeRef
  };
}

export default defineComponent({
  name: "AuthorityRole",
  components: { FsPermissionTree },
  setup() {
    //授权配置
    const authz = useAuthz();
    const permission: UseCrudPermissionCompProps = {
      prefix: "sys:auth:role", //权限代码前缀
      extra: ({ hasActionPermission }: UseCrudPermissionExtraProps): any => {
        //额外按钮权限控制
        return { rowHandle: { buttons: { authz: { show: hasActionPermission("authz") } } } };
      }
    };

    // 初始化crud配置
    // 此处传入permission进行通用按钮权限设置，会通过commonOptions去设置actionbar和rowHandle的按钮的show属性
    // 更多关于按钮权限的源代码设置，请参考 ./src/plugin/fast-crud/index.js （75-77行）

    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { authz, permission } });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      ...authz
    };
  }
});
</script>
