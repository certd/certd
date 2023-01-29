<template>
  <fs-page>
    <template #header>
      <div class="title">权限管理</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <a-button v-permission="'sys:auth:per:add'" style="margin-left: 20px" @click="addHandle({})">
        <fs-icon :icon="$fsui.icons.add"></fs-icon>
        添加</a-button
      >
      <fs-permission-tree
        class="permission-tree"
        :tree="crudBinding.data"
        :checkable="false"
        :actions="permission"
        @add="addHandle"
        @edit="editHandle"
        @remove="removeHandle"
      ></fs-permission-tree>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose, CrudExpose, useUi } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import FsPermissionTree from "./fs-permission-tree.vue";
import { usePermission } from "/src/plugin/permission";
export default defineComponent({
  name: "AuthorityPermission",
  components: { FsPermissionTree },
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const exposeRet: { expose: CrudExpose } = useExpose({ crudRef, crudBinding });
    const expose: CrudExpose = exposeRet.expose;
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    // 初始化crud配置
    // 此处传入permission进行通用按钮权限设置，会通过commonOptions去设置actionbar和rowHandle的按钮的show属性
    // 更多关于按钮权限的源代码设置，请参考 ./src/plugin/fast-crud/index.js （75-77行）
    const { resetCrudOptions } = useCrud({ expose, crudOptions, permission: "sys:auth:per" });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(async () => {
      await expose.doRefresh();
    });

    //用户业务代码

    async function addHandle(item) {
      await expose.openAdd({ initialForm: { parentId: item?.id ?? -1 } });
    }
    async function editHandle(item) {
      await expose.openEdit({ row: item });
    }
    async function removeHandle(item) {
      await expose.doRemove({ row: { id: item.id } });
    }

    const { hasPermissions } = usePermission();
    const permission = ref({
      add: hasPermissions("sys:auth:per:add"),
      edit: hasPermissions("sys:auth:per:edit"),
      remove: hasPermissions("sys:auth:per:remove")
    });

    return {
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
