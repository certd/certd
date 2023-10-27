<template>
  <fs-page>
    <template #header>
      <div class="title">新页面编辑</div>
    </template>
    <div class="p-5">
      <fs-form ref="formRef" v-bind="formOptions" />
      <div style="margin-top: 10px">
        <a-button v-if="formRef" @click="formRef.submit">保存</a-button>
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts">
import { useRoute } from "vue-router";
import { defineComponent, onMounted, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import * as api from "./api";
import { message } from "ant-design-vue";
import { usePageStore } from "/@/store/modules/page";

export default defineComponent({
  name: "FormNewPageEdit",
  setup(props, ctx) {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    const formRef = ref();
    const formOptions = ref();

    const route = useRoute();
    const id: any = route.query.id;

    if (id) {
      //编辑表单
      formOptions.value = crudBinding.value.editForm;
    } else {
      formOptions.value = crudBinding.value.addForm;
    }
    const doSubmit = formOptions.value.doSubmit;
    const pageStore = usePageStore();

    formOptions.value.doSubmit = (context: any) => {
      console.log("submit", context);
      doSubmit(context);
      //提交成功后，关闭本页面
      message.success("保存成功");
      pageStore.close({ tagName: route.fullPath });
    };

    const getDetail = async (id: any) => {
      return await api.GetObj(id);
    };

    onMounted(async () => {
      if (id) {
        //远程获取记录详情
        const detail = await getDetail(id);
        formRef.value.setFormData(detail);
      }
    });

    return {
      crudBinding,
      crudRef,
      formRef,
      formOptions
    };
  }
});
</script>
