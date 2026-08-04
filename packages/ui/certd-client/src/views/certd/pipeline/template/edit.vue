<template>
  <fs-page>
    <template #header>
      <div class="title flex flex-1">
        <fs-button class="back" icon="ion:chevron-back-outline" @click="goBack"></fs-button>
        <text-editable v-if="detail?.template" v-model="detail.template.title" class="ml-10" :hover-show="false"></text-editable>
      </div>

      <div class="more flex items-center flex-1 justify-end">
        <loading-button type="primary" @click="doSave">Save template</loading-button>
        <loading-button class="ml-10" type="primary" @click="useTemplateCreate">Use template</loading-button>
        <loading-button class="ml-10" type="primary" danger @click="doDelete">Delete template</loading-button>
      </div>
    </template>
    <div class="page-template-edit">
      <div class="base"></div>
      <div class="props flex p-10">
        <div class="task-list w-50%">
          <div class="block-title flex flex-between">
            <div>
              Template pipeline parameters
              <div class="helper">Click plus to add a field as a template variable</div>
            </div>
            <div class="more">
              <router-link
                v-if="detail?.template?.pipelineId > 0"
                :to="{
                  path: '/certd/pipeline/detail',
                  query: { id: detail?.template?.pipelineId, editMode: true },
                }"
              >
                Edit template pipeline
              </router-link>
            </div>
          </div>
          <a-collapse v-if="detail?.template?.pipelineId > 0" v-model:active-key="activeKey">
            <a-collapse-panel v-for="(step, stepId) in steps" :key="stepId" class="step-item" :header="step.title">
              <div class="step-inputs flex flex-wrap">
                <div v-for="(input, key) of step.input" :key="key" class="hover:bg-gray-100 dark:hover:bg-[#2d2d2d] p-5 w-full xl:w-[50%]">
                  <div class="flex flex-between" :title="input.define.helper">
                    <div class="flex flex-1 overflow-hidden mr-5">
                      <span style="min-width: 140px" class="bas">
                        <a-tag color="green">{{ input.define.title }}</a-tag>
                      </span>
                      <span :title="input.value" class="ellipsis flex-1 text-nowrap">= {{ input.value }}</span>
                    </div>
                    <fs-button v-if="!templateProps.input[stepId + '.' + key]" size="small" type="primary" icon="ion:add" title="Add as template variable" @click="addToProps(step.id, key)"></fs-button>
                    <fs-button v-else size="small" danger icon="ion:close" title="Delete template variable" @click="removeToProps(step.id, key)" />
                  </div>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <div v-else-if="detail?.template?.pipelineId === 0">
            <div class="p-20 flex flex-col flex-center text-sm">
              <div class="mb-10">No template pipeline bound yet</div>
              <div>
                <a-button type="primary" @click="bindPipelineByCreate">Create new pipeline as template</a-button>or<a-button type="primary" @click="bindPipelineByCopy">Copy from existing pipeline</a-button>
              </div>
            </div>
          </div>
        </div>

        <div class="template-props w-50%">
          <div class="block-title">
            Template variables
            <div class="helper">When creating a pipeline from this template, only enter these fields; other fields use the values on the left</div>
          </div>
          <div class="p-10">
            <!--          <fs-form v-bind="templateFormOptions"></fs-form>-->
            <template-form :input="templateProps.input" :pipeline="detail?.pipeline"></template-form>
          </div>
        </div>
      </div>
    </div>
  </fs-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { templateApi } from "./api";
import { usePluginStore } from "/@/store/plugin";
import { useStepHelper } from "./utils";
import TemplateForm from "./form.vue";
import { Modal, notification } from "ant-design-vue";
import { useTabbarStore } from "/@/vben/stores";
import { useTemplate } from "./use";
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
const templateProps: Ref = ref({
  input: {},
});
const detail: Ref<TemplateDetail> = ref();
async function getTemplateDetail() {
  if (!templateId) {
    return;
  }
  const res = await templateApi.GetDetail(parseInt(templateId));
  detail.value = res;
  if (res.template.content) {
    templateProps.value = JSON.parse(res.template.content);
  }
}

const pluginStore = usePluginStore();

const activeKey = ref([]);
onMounted(async () => {
  await pluginStore.init();
  await getTemplateDetail();
  nextTick(() => {
    const keys = Object.keys(steps.value);
    if (keys.length > 0) {
      activeKey.value = [keys[0]];
    }
  });
});

const { getStepsMap } = useStepHelper(pluginStore);
const steps = computed(() => {
  if (!detail.value || !detail.value.pipeline) {
    return {};
  }

  return getStepsMap(detail.value.pipeline);
});

function addToProps(stepId: string, key: any) {
  if (!templateProps.value.input) {
    templateProps.value.input = {};
  }
  const inputKey = stepId + "." + key;
  templateProps.value.input[inputKey] = true;
}

function removeToProps(stepId: string, key: any) {
  const inputKey = stepId + "." + key;
  delete templateProps.value.input[inputKey];
}

async function doSave() {
  await templateApi.UpdateObj({
    id: detail.value.template.id,
    title: detail.value.template.title,
    content: JSON.stringify(templateProps.value),
  });
  notification.success({
    message: "Saved successfully",
  });
}

const tabbar = useTabbarStore();
async function doDelete() {
  Modal.confirm({
    title: "Delete template?",
    content: "After deletion, this template pipeline can no longer be used",
    onOk() {
      templateApi.DelObj(detail.value.template.id);
      notification.success({
        message: "Deleted successfully",
      });
      tabbar.closeTab({ fullPath: route.fullPath } as any, router);
    },
  });
}

async function bindPipelineByCreate() {
  //
  // openAddCertdPipelineDialog({ templateId: detail.value.template.id });
}

async function bindPipelineByCopy() {}

const { openCreateFromTemplateDialog } = useTemplate();

async function useTemplateCreate() {
  openCreateFromTemplateDialog({ templateId: detail.value.template.id });
}
</script>
