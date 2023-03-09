<template>
  <fs-page>
    <template #header>
      <div class="title">
        字段列排序
        <span class="sub">表格列和表单字段可以单独配置顺序，配置order即可控制字段的顺序，数字越小越靠前，默认为1，（配置0或负数排前面，配置2以上排后面）</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/columns.html#key-column-order">列顺序配置</a> /
        <a target="_blank" href="http://fast-crud.docmirror.cn/api/crud-options/columns.html#key-form-order">表单字段顺序配置</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message="" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "FeatureColumnSort",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, selectedIds } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
