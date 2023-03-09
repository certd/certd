<template>
  <fs-page>
    <template #header>
      <div class="title">
        原型复制Dict
        <span class="sub">dict配置作为原型，任何用到的地方都会clone一个新的实例例（同一个字段每一行的dict都是不一样的）</span>
      </div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/advance/dict.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="warning" message="------点击switch看效果-------↓↓↓↓↓↓↓↓" />
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
export default defineComponent({
  name: "DictPrototype",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose });
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
