<template>
  <a-drawer v-model:open="afterTaskDrawerVisible" placement="right" :closable="true" width="680px" class="pi-after-task-form">
    <template #title>
      <div>
        {{ t("certd.edit_after_task") }}
        <a-button v-if="mode === 'edit'" danger @click="afterTaskDelete()">
          <template #icon>
            <DeleteOutlined />
          </template>
        </a-button>
      </div>
    </template>
    <template v-if="currentAfterTask">
      <pi-container class="after-task-form-container">
        <!-- 未选择插件时：插件选择器 -->
        <plugin-selector v-if="showPluginSelector" v-model="currentAfterTask.type" :filter-fn="isAfterTaskPlugin" @select="onPluginSelect" @confirm="onPluginConfirm" />
        <!-- 已选择插件：说明框 + 配置表单 -->
        <a-form v-else ref="afterTaskFormRef" class="after-task-form" :model="currentAfterTask" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-alert type="info" :message="currentPlugin.title" class="mb-6">
            <template #description>
              <div v-html="transformDesc(currentPlugin.desc)"></div>
            </template>
            <template #action>
              <a v-if="editMode && mode !== 'edit'" @click="backToPluginSelect">重新选择插件</a>
            </template>
          </a-alert>

          <fs-form-item
            v-model="currentAfterTask.title"
            :item="{
              title: t('certd.after_task_name'),
              key: 'title',
              component: { name: 'a-input', vModel: 'value' },
              rules: [{ required: true, message: t('certd.required') }],
            }"
          />
          <fs-form-item
            v-model="currentAfterTask.when"
            :item="{
              title: t('certd.trigger_time'),
              key: 'when',
              value: ['success'],
              component: {
                name: 'a-select',
                vModel: 'value',
                disabled: !editMode,
                mode: 'multiple',
                options: whenOptions,
              },
              helper: t('certd.after_task_when_helper'),
              rules: [{ required: true, message: t('certd.required') }],
            }"
          />

          <template v-for="(item, key) in currentPlugin.input" :key="key">
            <fs-form-item v-if="item.show !== false" v-model="currentAfterTask.input[key]" :item="item" :get-context-fn="getScopeFunc" />
          </template>
        </a-form>

        <template #footer>
          <!-- 插件选择阶段：确定进入配置表单 -->
          <a-form-item v-if="editMode && showPluginSelector" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="confirmPluginSelect"> {{ t("certd.confirm") }} </a-button>
          </a-form-item>
          <!-- 配置表单阶段：保存后置任务 -->
          <a-form-item v-else-if="editMode" :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="afterTaskSave"> {{ t("certd.confirm") }} </a-button>
          </a-form-item>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="ts" setup>
import { Modal } from "ant-design-vue";
import { onMounted, ref, Ref, watch } from "vue";
import { cloneDeep } from "lodash-es";
import { nanoid } from "nanoid";
import { usePluginStore } from "/@/store/plugin";
import { useReference } from "/@/use/use-refrence";
import { useI18n } from "/src/locales";
import { utils } from "/@/utils";
import PluginSelector from "../plugin-selector/index.vue";

const { t } = useI18n();

defineOptions({
  name: "PiAfterTaskForm",
});

const props = defineProps<{
  editMode: boolean;
}>();

const mode = ref("add");
const callback = ref();
const currentAfterTask: Ref<any> = ref({ id: undefined, title: "", when: [], type: undefined, input: {} });
const currentPlugin: Ref<any> = ref({});
const afterTaskFormRef = ref(null);
const afterTaskDrawerVisible = ref(false);
// 是否显示插件选择器（新增且未选择插件时为 true）
const showPluginSelector = ref(false);

const whenOptions = [
  { value: "success", label: t("certd.success_time") },
  { value: "turnToSuccess", label: t("certd.fail_to_success_time") },
  { value: "error", label: t("certd.fail_time") },
];

const pluginStore = usePluginStore();

// 仅显示可作后置任务的插件
function isAfterTaskPlugin(plugin: any) {
  return plugin.supportAfterTask === true;
}

const afterTaskDrawerShow = () => {
  afterTaskDrawerVisible.value = true;
};
const afterTaskDrawerClose = () => {
  afterTaskDrawerVisible.value = false;
};

const afterTaskOpen = (afterTask: any, emit: any) => {
  callback.value = emit;
  currentAfterTask.value = cloneDeep(afterTask);
  currentAfterTask.value.input = currentAfterTask.value.input || {};
  // 新增且未选插件：先选插件；否则直接显示配置表单
  showPluginSelector.value = mode.value === "add" && !currentAfterTask.value.type;
  if (currentAfterTask.value.type) {
    onPluginChange(currentAfterTask.value.type);
  }
  afterTaskDrawerShow();
};

const afterTaskAdd = (emit: any) => {
  mode.value = "add";
  const afterTask: any = { id: nanoid(), title: "", when: ["success", "turnToSuccess"], type: undefined, input: {} };
  afterTaskOpen(afterTask, emit);
};

const afterTaskEdit = (afterTask: any, emit: any) => {
  mode.value = "edit";
  afterTaskOpen(afterTask, emit);
};

const afterTaskView = (afterTask: any, emit: any) => {
  mode.value = "view";
  afterTaskOpen(afterTask, emit);
};

// 单击插件卡片：选中（高亮），不进入表单
const onPluginSelect = (item: any) => {
  currentAfterTask.value.type = item.name;
  currentAfterTask.value.title = item.title || currentAfterTask.value.title;
};

// 双击插件卡片：选中并直接进入配置表单
const onPluginConfirm = (item: any) => {
  onPluginSelect(item);
  enterPluginForm();
};

// 插件选择阶段点「确定」：进入配置表单
const confirmPluginSelect = () => {
  if (!currentAfterTask.value.type) {
    Modal.warning({
      title: t("certd.after_task_plugin"),
      content: t("certd.please_select_type"),
    });
    return;
  }
  enterPluginForm();
};

// 进入插件配置表单（初始化插件输入默认值）
const enterPluginForm = () => {
  currentAfterTask.value.input = {};
  currentPlugin.value = {};
  showPluginSelector.value = false;
  onPluginChange(currentAfterTask.value.type);
};

// 返回插件选择器重新选择（保留名称/条件/延迟配置）
const backToPluginSelect = () => {
  currentAfterTask.value.type = undefined;
  currentPlugin.value = {};
  showPluginSelector.value = true;
};

// 插件类型变化时加载插件输入表单
watch(
  () => currentAfterTask.value?.type,
  (type: string) => {
    if (type) {
      onPluginChange(type);
    }
  }
);

const onPluginChange = async (type: string) => {
  if (!type) {
    currentPlugin.value = {};
    return;
  }
  const define = await pluginStore.getPluginDefine(type);
  currentPlugin.value = define || {};
  // 初始化插件输入默认值
  const input: any = currentAfterTask.value.input || {};
  for (const key in define?.input || {}) {
    const column = define.input[key];
    useReference(column);
    if ((column.default != null || column.value != null) && input[key] == null) {
      input[key] = column.default ?? column.value;
    }
  }
  currentAfterTask.value.input = input;
};

const getScopeFunc = () => {
  return {
    form: currentAfterTask.value,
  };
};

const transformDesc = (desc: string = "") => {
  return utils.transformLink(desc);
};

const afterTaskSave = async (e: any) => {
  try {
    await afterTaskFormRef.value.validate();
  } catch (e) {
    console.error("表单验证失败:", e);
    return;
  }
  callback.value("save", currentAfterTask.value);
  afterTaskDrawerClose();
};

const afterTaskDelete = () => {
  Modal.confirm({
    title: t("certd.confirm"),
    content: t("certd.after_task_delete_confirm"),
    async onOk() {
      callback.value("delete");
      afterTaskDrawerClose();
    },
  });
};

const labelCol = { span: 6 };
const wrapperCol = { span: 16 };

defineExpose({
  afterTaskAdd,
  afterTaskEdit,
  afterTaskView,
  afterTaskDelete,
  afterTaskSave,
  afterTaskOpen,
  afterTaskDrawerShow,
});
</script>

<style lang="less">
.pi-after-task-form {
  .after-task-form-container {
    display: flex;
    flex-direction: column;
    height: 100%;

    > .ant-form {
      padding: 0 10px;
    }
  }
}
</style>
