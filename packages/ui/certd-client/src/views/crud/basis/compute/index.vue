<template>
  <fs-page>
    <template #header>
      <div class="title">
        动态计算
        <fs-icon icon="ion:apps-sharp" :spin="true" />
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/compute.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-tooltip title="我能控制表格显隐">
          <span class="ml-1">表格显隐:<a-switch v-model:checked="showTableRef"></a-switch></span>
        </a-tooltip>
        <span class="ml-1">列显隐:<a-switch v-model:checked="columnComponentShowRef"></a-switch></span>
        <span class="ml-1">列显隐2:<a-button @click="columnsMapSetShow">列显隐2</a-button></span>
        <a-alert class="ml-1" type="info" message="点击下方右边的编辑按钮查看示例效果-----------> ↓↓↓↓↓" />
      </template>
      <template #form_refSwitch>
        <a-switch v-model:checked="showRef"></a-switch>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "BasisCompute",
  setup() {
    //普通的ref引用，可以动态切换配置
    const showRef = ref(false);
    const showTableRef = ref(true);
    const showTableComputed = computed(() => {
      return showTableRef.value;
    });

    const columnComponentShowRef = ref(true);
    const columnComponentShowComputed = computed(() => {
      return columnComponentShowRef.value;
    });

    const context = {
      showRef,
      showTableRef,
      showTableComputed,
      columnComponentShowRef,
      columnComponentShowComputed
    };

    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });
    function columnsMapSetShow() {
      crudBinding.value.table.columnsMap["id"].show = !crudBinding.value.table.columnsMap["id"].show;
    }
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      ...context,
      columnsMapSetShow
    };
  }
});
</script>
