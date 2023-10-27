<template>
  <fs-page>
    <template #header>
      <div class="title">
        列设置
        <span class="sub">列设置可以禁用或者隐藏某字段勾选 ，-------> 点击右侧最后一个按钮查看效果</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/toolbar.html#columnsfilter-mode">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";

export default defineComponent({
  name: "BasisColumnsSet",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    function columnsSetToggleMode() {
      crudBinding.value.toolbar.columnsFilter.mode = crudBinding.value.toolbar.columnsFilter.mode === "simple" ? "default" : "simple";
      message.info("点击列设置按钮查看效果，当前列设置组件的模式为：" + crudBinding.value.toolbar.columnsFilter.mode);
    }

    function columnsSetShowToggle() {
      crudBinding.value.table.columns.disabled.columnSetShow = !crudBinding.value.table.columns.disabled.columnSetShow;
    }
    return {
      crudBinding,
      crudRef,
      columnsSetToggleMode,
      columnsSetShowToggle
    };
  }
});
</script>
