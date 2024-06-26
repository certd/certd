<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
    <advanced-in-drawer-class-time ref="drawerClassTimeRef" />
  </fs-page>
</template>

<script lang="ts" setup>
import { defineComponent, onMounted, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import AdvancedInDrawerClassTime from "./drawer-class-time/index.vue";
//保留子组件的ref引用
const drawerClassTimeRef = ref();
//通过context传递到crud.tsx中
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { drawerClassTimeRef } });

defineOptions({
  name: "AdvancedInDrawer"
});

// 页面打开后获取列表数据
onMounted(() => {
  crudExpose.doRefresh();
});
</script>
