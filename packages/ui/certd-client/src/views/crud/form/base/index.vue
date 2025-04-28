<template>
  <fs-page>
    <template #header>
      <div class="title">基本表单</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #form-body-top>
        <div style="display: flex">
          <div>
            <span>label宽度设置:</span>
            <a-slider v-model:value="labelWidthRef" style="width: 200px" :min="40" :max="300" />
          </div>
          <div>
            <span>label位置:</span>
            <a-radio-group
              v-model:value="labelLayoutRef"
              :options="[
                {
                  value: 'vertical',
                  label: '上置'
                },
                {
                  value: 'horizontal',
                  label: '左置'
                }
              ]"
            />
          </div>
        </div>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { useFsAsync, useFsRef } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud.jsx";

export default defineComponent({
  name: "FormBase",
  setup() {
    const labelWidthRef = ref(100);
    const labelLayoutRef = ref("horizontal");
    const context = {
      labelWidthRef,
      labelLayoutRef
    };

    const { crudRef, crudBinding, crudExpose } = useFsRef();
    // 页面打开后获取列表数据
    onMounted(async () => {
      await useFsAsync({ crudRef, crudBinding, crudExpose, createCrudOptions, context });

      await crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef,
      labelWidthRef,
      labelLayoutRef
    };
  }
});
</script>
