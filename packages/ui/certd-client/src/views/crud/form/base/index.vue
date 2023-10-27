<template>
  <fs-page>
    <template #header>
      <div class="title">基本表单</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #form-body-top>
        <div style="display: flex">
          <span>label宽度设置:</span>
          <a-slider v-model:value="labelWidthRef" style="width: 200px" :min="40" :max="300"></a-slider>
        </div>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.jsx";

export default defineComponent({
  name: "FormBase",
  setup() {
    const labelWidthRef = ref(100);
    const context = {
      labelWidthRef
    };
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

    // 页面打开后获取列表数据
    onMounted(async () => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      labelWidthRef
    };
  }
});
</script>
