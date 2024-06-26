<template>
  <a-drawer v-model:open="drawerOpened" width="1000px">
    <fs-crud ref="crudRef" v-bind="crudBinding"></fs-crud>
  </a-drawer>
</template>

<script lang="ts" setup>
import { ref, nextTick } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
const textbookRef = ref();
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { textbookRef } });

//课时子表组件名称定义
defineOptions({
  name: "AdvancedInDrawerClassTime"
});
const drawerOpened = ref(false);

//定义抽屉打开方法
const open = async ({ textbook }) => {
  textbookRef.value = textbook;
  drawerOpened.value = true;
  await nextTick(); //等待crud初始化完成
  //设置查询条件，只查询当前选中的教材id
  crudExpose.setSearchFormData({ form: { textbookId: textbook.id } });
  //刷新课时表
  await crudExpose.doRefresh();
};

//暴露出去，父组件通过ref可以调用open方法
defineExpose({
  open
});
</script>
