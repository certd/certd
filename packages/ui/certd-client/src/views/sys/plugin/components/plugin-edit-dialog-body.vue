<template>
  <div class="plugin-edit-dialog-body">
    <div class="plugin-edit-dialog-body__header">
      <span>插件名称：</span>
      <fs-copyable :model-value="pluginName" />
      <a-button v-if="canEditPlugin" class="plugin-edit-dialog-body__ai-dev" @click="openAiDev">AI 开发</a-button>
      <a-button v-if="canEditPlugin" class="plugin-edit-dialog-body__publish" :loading="isPublishingPlugin(plugin)" @click="doPublish">发布到插件市场</a-button>
    </div>
    <div class="plugin-edit-dialog-body__content">
      <section class="plugin-edit-dialog-body__base">
        <a-tabs type="card">
          <a-tab-pane key="base" tab="插件信息" />
        </a-tabs>
        <div class="plugin-edit-dialog-body__base-content">
          <fs-form ref="baseFormRef" v-bind="formOptionsRef" />
        </div>
      </section>
      <section class="plugin-edit-dialog-body__editor plugin-edit-dialog-body__metadata">
        <a-tabs type="card">
          <a-tab-pane key="metadata" tab="元数据" />
        </a-tabs>
        <code-editor :id="`plugin-metadata-${pluginId}`" v-model:model-value="plugin.metadata" language="yaml" @save="doSave" />
      </section>
      <section class="plugin-edit-dialog-body__editor plugin-edit-dialog-body__script">
        <a-tabs type="card">
          <a-tab-pane key="script" tab="脚本" />
        </a-tabs>
        <code-editor :id="`plugin-content-${pluginId}`" v-model:model-value="plugin.content" language="javascript" @save="doSave" />
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, provide, ref, type Ref } from "vue";
import { notification } from "ant-design-vue";
import { useColumns } from "@fast-crud/fast-crud";
// @ts-ignore js-yaml 没有在当前前端包中提供类型声明。
import yaml from "js-yaml";
import * as api from "../api";
import createCrudOptions from "../crud";
import { compareVersions } from "../use-online-install";
import { usePluginPublish } from "../use-publish";
import { usePluginStore } from "/@/store/plugin";
import { usePluginAiDev } from "../use-ai-dev";
import { useI18n } from "/src/locales";

defineOptions({
  name: "PluginEditDialogBody",
});

const props = defineProps<{
  pluginId: number | string;
}>();

const emit = defineEmits<{
  (event: "saved"): void;
}>();

const pluginStore = usePluginStore();
const { t } = useI18n();
const plugin = ref<any>({});
const formOptionsRef: Ref = ref();
const baseFormRef: Ref = ref({});
const saveLoading = ref(false);
const { isPublishingPlugin, publishLocalPlugin } = usePluginPublish();
const { openAiDevDialog } = usePluginAiDev();

function initFormOptions() {
  const formCrudOptions = createCrudOptions({
    // 编辑弹框只复用插件表单字段，不需要 CRUD 实例。
    // @ts-ignore
    crudExpose: {},
    context: {},
  });
  const { buildFormOptions } = useColumns();
  const formOptions = buildFormOptions(formCrudOptions.crudOptions, {});
  formOptions.mode = "edit";
  formOptions.col = { span: 24 };
  formOptions.labelCol = { style: { width: "100px" } };
  formOptionsRef.value = formOptions;
}

initFormOptions();

const pluginName = computed(() => {
  const author = String(plugin.value.author || "").trim();
  if (author && author.toLowerCase() !== "local") {
    return `${author}/${plugin.value.name}`;
  }
  return plugin.value.name || "";
});

const canEditPlugin = computed(() => {
  return plugin.value?.editable === true;
});

provide("get:plugin", () => plugin);

async function loadPlugin() {
  const pluginObj = await api.GetObj(props.pluginId);
  plugin.value = pluginObj;
  const baseForm = { ...pluginObj };
  baseForm.vip = baseForm.vip || "free";
  if (baseForm.extra) {
    baseForm.extra = yaml.load(baseForm.extra);
  }
  delete baseForm.metadata;
  delete baseForm.content;
  baseFormRef.value.setFormData(baseForm);
}

function validate() {
  try {
    yaml.load(plugin.value.metadata);
  } catch (error: any) {
    const message = `元数据校验失败:${error.message}`;
    notification.error({ message });
    throw new Error(message);
  }
}

function buildSubmitForm(versionOverride?: string) {
  const baseForm = baseFormRef.value.getFormData();
  const source = { ...plugin.value, ...baseForm };
  const form: Record<string, any> = { id: plugin.value.id };
  const editableFields = ["name", "author", "icon", "title", "group", "desc", "setting", "sysSetting", "content", "version", "pluginType", "metadata", "extra", "dependPlugins", "vip", "disabled"];
  for (const field of editableFields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      form[field] = source[field];
    }
  }
  if (versionOverride) {
    form.version = versionOverride;
  }
  if (form.extra) {
    form.extra = yaml.dump(form.extra);
  }
  return form;
}

async function doSave(versionOverride?: string) {
  if (!canEditPlugin.value) {
    notification.warning({ message: "当前绑定账号无权编辑该插件" });
    return;
  }
  validate();
  const form = buildSubmitForm(versionOverride);
  // 本地编辑后必须提升版本号才能保存：本地版本需要高于云端已发布版本
  if (form.latest && form.version && compareVersions(form.version, form.latest) <= 0) {
    notification.warning({
      message: t("certd.onlinePluginVersionMustExceedLatest", { version: `v${form.latest}` }),
    });
    return;
  }
  saveLoading.value = true;
  try {
    await api.UpdateObj(form);
    plugin.value = { ...plugin.value, ...form };
    pluginStore.clear();
    notification.success({ message: "保存成功" });
    emit("saved");
    return form;
  } finally {
    saveLoading.value = false;
  }
}

async function doPublish() {
  const baseForm = baseFormRef.value.getFormData();
  const currentPlugin = { ...plugin.value, ...baseForm };
  await publishLocalPlugin(currentPlugin, {
    beforePublish: doSave,
    async afterPublish() {
      await loadPlugin();
    },
  });
}

async function openAiDev() {
  await openAiDevDialog({
    pluginId: props.pluginId,
    pluginName: pluginName.value,
  });
}

onMounted(loadPlugin);

defineExpose({
  save: doSave,
});
</script>

<style lang="less">
.plugin-edit-dialog-body {
  display: flex;
  height: 100%;
  overflow: hidden;
  flex-direction: column;

  &__header {
    display: flex;
    min-height: 32px;
    align-items: center;
    color: #5f6b7a;
    font-size: 13px;
  }

  &__publish {
    margin-left: auto;
  }

  &__ai-dev {
    margin-left: auto;
  }

  &__ai-dev + &__publish {
    margin-left: 8px;
  }

  &__content {
    display: grid;
    min-height: 0;
    overflow: hidden;
    flex: 1;
    grid-template-columns: minmax(260px, 0.72fr) minmax(330px, 1fr) minmax(430px, 1.35fr);
    gap: 16px;
    margin-top: 12px;
  }

  &__base,
  &__editor {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
  }

  &__base {
    padding-right: 16px;
    border-right: 1px solid #f0f0f0;
  }

  &__base-content {
    min-height: 0;
    flex: 1;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .fs-editor-code {
    height: auto;
    min-height: 0;
    flex: 1;
  }

  .ant-tabs {
    flex: none;
  }
}

.dark .plugin-edit-dialog-body {
  &__base {
    border-right-color: #303030;
  }
}
</style>
