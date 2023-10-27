<template>
  <fs-page>
    <template #header>
      <div class="title">CRUD示例【国际化】</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/start/i18n.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="warning" message="右上角切换语言查看效果" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud.js";
import { useFs } from "@fast-crud/fast-crud";

export default defineComponent({
  name: "BasisI18n",
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
