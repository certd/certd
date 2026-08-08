<template>
  <fs-page>
    <template #header>
      <div class="title flex flex-1">
        <fs-button class="back" icon="ion:chevron-back-outline" @click="goBack"></fs-button>
        <text-editable v-if="detail?.template" v-model="detail.template.title" class="ml-10" :hover-show="false"></text-editable>
      </div>

      <div class="more flex items-center flex-1 justify-end">
        <loading-button type="primary" @click="doSave">保存模版</loading-button>
        <loading-button class="ml-10" type="primary" @click="useTemplateCreate">使用模版</loading-button>
        <loading-button class="ml-10" type="primary" danger @click="doDelete">删除模版</loading-button>
      </div>
    </template>
    <div class="page-template-edit">
      <div class="base"></div>
      <div class="props flex p-10">
        <div class="task-list w-50%">
          <div class="block-title flex flex-between">
            <div>
              模版流水线参数
              <div class="helper">点击加号，将字段作为模版变量</div>
            </div>
            <div class="more">
              <router-link
                v-if="detail?.template?.pipelineId > 0"
                :to="{
                  path: '/certd/pipeline/detail',
                  query: { id: detail?.template?.pipelineId, editMode: true },
                }"
              >
                修改模版流水线
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
                    <fs-button v-if="!templateProps.input[stepId + '.' + key]" size="small" type="primary" icon="ion:add" title="添加为模版变量" @click="addToProps(step.id, key)"></fs-button>
                    <fs-button v-else size="small" danger icon="ion:close" title="删除模版变量" @click="removeToProps(step.id, key)" />
                  </div>
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>

          <div v-else-if="detail?.template?.pipelineId === 0">
            <div class="p-20 flex flex-col flex-center text-sm">
              <div class="mb-10">还未绑定模版流水线</div>
              <div>
                <a-button type="primary" @click="bindPipelineByCreate">创建新流水线作为模版</a-button>
                或
                <a-button type="primary" @click="bindPipelineByCopy">从已有流水线复制</a-button>
              </div>
            </div>
          </div>
        </div>

        <div class="template-props w-50%">
          <div class="block-title">
            模版变量
            <div class="helper">根据模版创建流水线时，只需要输入以下这些字段，其他字段将使用左侧的值</div>
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
    message: "保存成功",
  });
}

const tabbar = useTabbarStore();
async function doDelete() {
  Modal.confirm({
    title: "确定删除模版？",
    content: "删除后，该模版流水线将不能再使用",
    onOk() {
      templateApi.DelObj(detail.value.template.id);
      notification.success({
        message: "删除成功",
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
