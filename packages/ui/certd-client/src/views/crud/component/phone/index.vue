<template>
  <fs-page>
    <template #header>
      <div class="title">
        国际手机号输入
        <span class="sub"> </span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/components/extends/input/components/fs-phone-input">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "ComponentPhone",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
