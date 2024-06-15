<template>
  <fs-page>
    <template #header>
      <div class="title">权限管理</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <a-button v-permission="'sys:auth:per:add'" style="margin-left: 20px" @click="addHandle({})">
        <fs-icon :icon="ui.icons.add"></fs-icon>
        添加
      </a-button>
      <fs-permission-tree class="permission-tree mt-10" :tree="crudBinding.data" :checkable="false" :actions="permission" @add="addHandle" @edit="editHandle" @remove="removeHandle"></fs-permission-tree>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import createCrudOptions from "./crud.js";
import FsPermissionTree from "./fs-permission-tree.vue";
import { usePermission } from "/src/plugin/permission";
import { useFs, useUi } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "AuthorityPermission",
  components: { FsPermissionTree },
  setup() {
    // 此处传入permission进行通用按钮权限设置，会通过commonOptions去设置actionbar和rowHandle的按钮的show属性
    // 更多关于按钮权限的源代码设置，请参考 ./src/plugin/fast-crud/index.js （75-77行）
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { permission: "sys:auth:per" } });

    // 页面打开后获取列表数据
    onMounted(async () => {
      await crudExpose.doRefresh();
    });

    const { ui } = useUi();

    //用户业务代码

    async function addHandle(item: any) {
      await crudExpose.openAdd({ row: { parentId: item?.id ?? -1 } });
    }
    async function editHandle(item: any) {
      await crudExpose.openEdit({ row: item });
    }
    async function removeHandle(item: any) {
      await crudExpose.doRemove({ row: { id: item.id }, index: null });
    }

    const { hasPermissions } = usePermission();
    const permission = ref({
      add: hasPermissions("sys:auth:per:add"),
      edit: hasPermissions("sys:auth:per:edit"),
      remove: hasPermissions("sys:auth:per:remove")
    });

    return {
      ui,
      crudBinding,
      crudRef,
      addHandle,
      editHandle,
      removeHandle,
      permission
    };
  }
});
</script>
<style lang="less">
.permission-tree {
  margin-left: 20px;
}
</style>
