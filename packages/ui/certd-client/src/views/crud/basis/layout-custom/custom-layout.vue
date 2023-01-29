<template>
  <div class="custom-layout">
    <div class="layout-header">
      <!-- ↓↓↓↓↓  关键插槽：查询  ↓↓↓↓ -->
      <slot name="search"></slot>
      <!-- ↓↓↓↓↓  关键插槽：工具条  ↓↓↓↓ -->
      <slot name="toolbar"></slot>
    </div>
    <div class="layout-top">
      <!-- ↓↓↓↓↓  关键插槽：动作条  ↓↓↓↓ -->
      <slot name="actionbar"></slot>
      <!-- ↓↓↓↓↓  上翻页条  ↓↓↓↓ -->
      <slot name="pagination"></slot>
    </div>

    <!-- 高度需要自适应撑开，可以通过flex:1 -->
    <div class="layout-body">
      <!-- 默认插槽 -->
      <slot></slot>
      <!-- ↓↓↓↓↓  关键插槽：表格  ↓↓↓↓ -->
      <slot name="table"></slot>

      <!-- ↓↓↓↓↓  关键插槽：表单  ↓↓↓↓ -->
      <slot name="form"></slot>
    </div>
    <div class="layout-footer">
      <!-- ↓↓↓↓↓  关键插槽：分页条  ↓↓↓↓ -->
      <slot name="pagination"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
/**
 * 自定义布局
 */
export default defineComponent({
  name: "CustomLayout"
});
</script>

<style lang="less">
.custom-layout {
  height: 100%;
  display: flex;
  flex-direction: column;

  .layout-header {
    padding: 10px 10px 5px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .layout-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 10px 5px 10px;
  }
  .layout-body {
    flex: 1; //重要，自适应撑开高度，表格固定表头必须
    overflow-y: auto;
  }
  .fs-crud-actionbar {
    display: flex;
    align-items: center;
  }
  .fs-crud-pagination {
    text-align: right;
    padding: 5px 10px 5px 10px;
  }
}
</style>
