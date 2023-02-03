<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">我的流水线</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <pi-certd-form ref="certdFormRef"></pi-certd-form>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { useExpose } from "@fast-crud/fast-crud";
import PiCertdForm from "./certd-form/index.vue";
export default defineComponent({
  name: "PipelineManager",
  components: { PiCertdForm },
  setup() {
    const certdFormRef = ref();

    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();

    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose, certdFormRef });
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
      crudRef,
      certdFormRef
    };
  }
});
</script>
<style lang="less"></style>
