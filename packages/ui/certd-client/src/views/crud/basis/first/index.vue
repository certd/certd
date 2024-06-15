<template>
  <fs-page class="page-first">
    <template #header>
      <div class="title">第一个crud</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/start/first.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />

    <a-tour v-model:current="current" :open="open" :steps="steps" @close="handleOpen(false)" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";
import { useFs, utils } from "@fast-crud/fast-crud";
import createCrudOptions, { FirstContext } from "./crud";
import { TourProps } from "ant-design-vue";
import { FirstRow } from "./api";

//此处为组件定义
export default defineComponent({
  name: "FsCrudFirst",
  setup() {
    // // crud组件的ref
    // const crudRef: Ref = ref();
    // // crud 配置的ref
    // const crudBinding: Ref<CrudBinding> = ref();
    // // 暴露的方法
    // const { crudExpose } = useExpose({ crudRef, crudBinding });
    // // 你的crud配置
    // const { crudOptions, customExport } = createCrudOptions({ crudExpose, customValue });
    // // 初始化crud配置
    // const { resetCrudOptions, appendCrudBinding } = useCrud({ crudExpose, crudOptions });

    //  =======以上为fs的初始化代码=========
    //  =======你可以简写为下面这一行========
    const { crudRef, crudBinding, crudExpose, context } = useFs<FirstRow, FirstContext>({ createCrudOptions, context: {} });

    utils.logger.info("test", context.test);

    function useTour() {
      const open = ref<boolean>(false);
      const current = ref(0);
      //帮助向导
      const steps: TourProps["steps"] = [
        {
          title: "查询",
          description: "查询数据.",
          target: () => {
            return document.querySelector(".page-first .fs-search-btn-search") as HTMLElement;
          }
        },
        {
          title: "重置",
          description: "重置查询条件.",
          target: () => {
            return document.querySelector(".page-first .fs-search-btn-reset") as HTMLElement;
          }
        },
        {
          title: "添加",
          description: "打开添加对话框",
          target: () => {
            return document.querySelector(".page-first .fs-actionbar-btn-add") as HTMLElement;
          }
        },
        {
          title: "刷新列表",
          description: "刷新列表",
          target: () => {
            return document.querySelector(".page-first .fs-toolbar-btn-refresh") as HTMLElement;
          }
        }
      ];

      const handleOpen = (val: boolean): void => {
        open.value = val;
      };

      return {
        open,
        current,
        steps,
        handleOpen
      };
    }
    const tour = useTour();

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      tour.handleOpen(true);
    });
    return {
      crudBinding,
      crudRef,
      ...tour
    };
  }
});
</script>
