<template>
  <fs-page class="page-template-import">
    <template #header>
      <div class="title flex flex-1 items-center">
        <fs-button class="back" icon="ion:chevron-back-outline" @click="goBack"></fs-button>
        <div class="ml-10">从模版{{ detail?.template?.title }}批量创建流水线</div>
      </div>
    </template>
    <fs-form v-if="importFromOptions" ref="formRef" class="mt-10" v-bind="importFromOptions"> </fs-form>
    <div class="p-10">
      <a-button class="ml-20" type="primary" @click="doImport">确定导入 </a-button>
    </div>
  </fs-page>
</template>

<script setup lang="tsx">
import { onMounted, ref, Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { templateApi } from "../api";
import { createFormOptions } from "/@/views/certd/pipeline/template/import/form";
import { cloneDeep } from "lodash-es";
import { fillPipelineByDefaultForm } from "/@/views/certd/pipeline/certd-form/use";
import { createPipelineByTemplate } from "/@/views/certd/pipeline/template/use";
import { notification, Modal } from "ant-design-vue";
const route = useRoute();
const templateId = route.query.templateId as string;

const router = useRouter();

function goBack() {
  router.back();
}

type TemplateDetail = {
  template: any;
  pipeline: any;
};

const detail: Ref<TemplateDetail> = ref();

async function getTemplateDetail() {
  if (!templateId) {
    return;
  }
  detail.value = await templateApi.GetDetail(parseInt(templateId));
}

const importFromOptions = ref();
onMounted(async () => {
  await getTemplateDetail();
  importFromOptions.value = createFormOptions(detail);
});

const formRef = ref();
async function doImport() {
  await formRef.value.validate();

  const form = formRef.value.getFormData();

  const importTableRef = formRef.value.getComponentRef("templateProps");

  const templateList = importTableRef.getData();

  const progress = ref({ total: templateList.length, current: 0 });
  async function requestImport() {
    for (let i = 0; i < templateList.length; i++) {
      const tempInputs = templateList[i];
      const title = tempInputs.title;
      delete tempInputs.title;

      let newPipeline = cloneDeep(detail.value.pipeline);
      newPipeline = fillPipelineByDefaultForm(newPipeline, form);

      await createPipelineByTemplate({
        templateId: parseInt(templateId),
        templateForm: tempInputs,
        pipeline: newPipeline,
        title: title,
        groupId: form.groupId,
      });
      progress.value.current = progress.value.current + 1;
    }
    notification.success({
      message: "导入完成",
    });

    importTableRef.clear();
  }
  requestImport();
  Modal.info({
    title: "导入中",
    content() {
      return (
        <div>
          当前导入进度： {progress.value.current} / {progress.value.total}
        </div>
      );
    },
  });
}
</script>

<style lang="less">
.page-template-import {
  .ant-table-container {
    .ant-select {
      width: 100%;
    }
  }
}
</style>
