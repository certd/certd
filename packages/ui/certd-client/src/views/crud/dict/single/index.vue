<template>
  <fs-page>
    <template #header>
      <div class="title">
        单例Dict
        <span class="sub">修改一个，影响全部组件</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/dict.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="warning" message="----------点击switch看效果----------↓↓↓↓↓↓↓↓↓↓↓↓↓↓" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";

export default defineComponent({
  name: "DictSingle",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    function onClick() {
      console.log("this.ref", crudRef.value);
    }

    return {
      crudBinding,
      crudRef,
      onClick
    };
  }
});
</script>
