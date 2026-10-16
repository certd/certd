<template>
  <a-drawer v-model:open="stepDrawerVisible" placement="right" :closable="true" width="760px" class="step-form-drawer" :class="{ fullscreen }">
    <template #title>
      <div>
        {{ t("certd.pipeline.editor.editStep") }}
        <template v-if="editMode">
          <a-button @click="stepDelete()">
            <template #icon>
              <DeleteOutlined />
            </template>
          </a-button>
        </template>
      </div>
      <div class="hidden md:block">
        <a-space>
          <fs-icon class="icon-button" :icon="fullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'" @click="fullscreen = !fullscreen"></fs-icon>
        </a-space>
      </div>
    </template>
    <template v-if="currentStep">
      <pi-container v-if="currentStep._isAdd" class="pi-step-form">
        <div class="flex-col h-100 overflow-hidden md:ml-5 md:mr-5 step-form-body">
          <a-tabs v-model:active-key="pluginSourceActive" class="step-plugin-source-tabs flex-1 overflow-hidden h-full">
            <a-tab-pane key="local" :tab="t('certd.pipeline.editor.installedPlugins')" class="h-full">
              <LocalPluginSelector :selected-type="currentStep.type" @select="stepTypeSelected" @confirm="handlePluginConfirm" />
            </a-tab-pane>
            <a-tab-pane v-if="userStore.isAdmin" key="market" :tab="t('certd.pipeline.editor.pluginMarket')" class="h-full step-market-pane">
              <OnlinePluginSelector :selected-type="currentStep.type" @select="stepTypeSelected" @confirm="handlePluginConfirm" @uninstalled="handleOnlinePluginUninstalled" />
            </a-tab-pane>
          </a-tabs>
        </div>
        <template #footer>
          <div class="bottom-button">
            <a-button v-if="editMode" type="primary" @click="stepTypeSave"> {{ t("certd.pipeline.editor.confirm") }}</a-button>
          </div>
        </template>
      </pi-container>
      <pi-container v-else class="pi-step-form">
        <template #header>
          <div class="mb-10">
            <a-alert type="info" :message="currentPlugin.title">
              <template #description>
                <div v-html="transformDesc(currentPlugin.desc)"></div>
              </template>
            </a-alert>
          </div>
        </template>
        <div class="w-100 h-100">
          <a-form ref="stepFormRef" class="step-form" :model="currentStep" :label-col="labelCol" :wrapper-col="wrapperCol">
            <fs-form-item-col
              v-model="currentStep.title"
              :item="{
                title: t('certd.pipeline.editor.taskName'),
                key: 'title',
                component: {
                  name: 'a-input',
                  vModel: 'value',
                },
                rules: [{ required: true, message: t('certd.pipeline.editor.required') }],
              }"
              :get-context-fn="getScopeFunc"
            />
            <template v-for="(item, key) in currentPlugin.input" :key="key">
              <fs-form-item-col v-model="currentStep.input[key]" :item="item" :get-context-fn="getScopeFunc" />
            </template>

            <fs-form-item-col v-if="settingStore.sysPublic.showRunStrategy || currentPlugin.showRunStrategy" v-model="currentStep.strategy.runStrategy" :item="runStrategyProps" :get-context-fn="getScopeFunc" />
          </a-form>
        </div>
        <template #footer>
          <div v-if="editMode" class="bottom-button">
            <a-button type="primary" @click="stepSave"> {{ t("certd.pipeline.editor.confirm") }}</a-button>
          </div>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="tsx" setup>
import { notification, Modal } from "ant-design-vue";
import { computed, provide, reactive, ref, Ref, UnwrapNestedRefs } from "vue";
import { merge, cloneDeep } from "lodash-es";
import { nanoid } from "nanoid";
import { usePluginStore } from "/@/store/plugin";
import { useReference } from "/@/use/use-refrence";
import { useSettingStore } from "/@/store/settings";
import { mitter } from "/@/utils/util.mitt";
import { utils } from "/@/utils";
import PluginSelector from "../plugin-selector/index.vue";
import { useUserStore } from "/@/store/user";
import LocalPluginSelector from "./local-plugin-selector.vue";
import OnlinePluginSelector from "./online-plugin-selector.vue";
import { useI18n } from "/@/locales";

defineOptions({
  name: "PiStepForm",
});
defineProps({
  editMode: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["update"]);

const userStore = useUserStore();
const { t } = useI18n();

const pluginStore = usePluginStore();
function transformDesc(desc: string = "") {
  return utils.transformLink(desc);
}

const settingStore = useSettingStore();

/**
 *  step drawer
 * @returns
 */
function useStepForm() {
  const settingStore = useSettingStore();
  const mode: Ref = ref("add");
  const callback: Ref = ref();
  const currentStep: UnwrapNestedRefs<any> = reactive({ title: undefined, input: {} });
  const currentStepScope = { form: currentStep };
  const stepFormRef: Ref = ref(null);
  const stepDrawerVisible: Ref = ref(false);
  const fullscreen: Ref<boolean> = ref(false);
  const rules: Ref = ref({
    name: [
      {
        type: "string",
        required: true,
        message: t("certd.pipeline.editor.enterName"),
      },
    ],
  });

  const stepTypeSelected = (item: any) => {
    if (item.__online) {
      return;
    }
    if (item.needPlus && !settingStore.isPlus) {
      notification.warning({ message: t("certd.pipeline.editor.plusPluginRequired") });
      mitter.emit("openVipModal");
      throw new Error(t("certd.pipeline.editor.plusPluginRequired"));
    }
    currentStep.type = item.name;
    currentStep.title = item.title;
    console.log("currentStepTypeChanged:", currentStep);
  };

  const stepTypeSave = async () => {
    currentStep._isAdd = false;
    if (currentStep.type == null) {
      notification.warning({ message: t("certd.pipeline.editor.pluginTypeFirst") });
      return;
    }

    // 给step的input设置默认值
    await changeCurrentPlugin(currentStep);

    //合并默认值
    merge(
      currentStep,
      {
        input: {},
        strategy: { runStrategy: 0 },
      },
      currentPlugin.value.default,
      currentStep
    );
  };

  // 双击插件卡片：选中并直接进入插件表单
  const stepTypeConfirm = (item: any) => {
    stepTypeSelected(item);
    stepTypeSave();
  };

  const stepDrawerShow = () => {
    stepDrawerVisible.value = true;
  };
  const stepDrawerClose = () => {
    stepDrawerVisible.value = false;
  };

  const stepOpen = (step: any, emit: any) => {
    callback.value = emit;
    for (const key of Object.keys(currentStep)) {
      delete currentStep[key];
    }
    merge(currentStep, { input: {}, strategy: {} }, step);
    // 旧版证书申请任务没有 version 字段，编辑时补成 1，保持旧任务继续走兼容逻辑。
    if (mode.value === "edit" && currentStep.type === "CertApply" && currentStep.input?.version == null) {
      currentStep.input.version = 1;
    }
    if (step.type) {
      changeCurrentPlugin(currentStep);
    }
    stepDrawerShow();
  };

  const stepAdd = (emit: any, stepDef: any) => {
    mode.value = "add";
    const step: any = {
      id: nanoid(),
      title: t("certd.pipeline.editor.newTask"),
      type: undefined,
      _isAdd: true,
      input: {},
      status: null,
    };
    merge(step, stepDef);
    stepOpen(step, emit);
  };

  const stepEdit = (step: any, emit: any) => {
    mode.value = "edit";
    stepOpen(step, emit);
  };

  const stepView = (step: any, emit: any) => {
    mode.value = "view";
    stepOpen(step, emit);
  };

  const currentPluginDefine = ref();
  provide("getCurrentPluginDefine", () => {
    return currentPluginDefine;
  });
  provide("get:plugin:type", () => {
    return "plugin";
  });

  const currentPlugin = computed(() => {
    return currentPluginDefine.value || {};
  });

  const changeCurrentPlugin = async (step: any) => {
    const stepType = step.type;
    step.type = stepType;
    step._isAdd = false;
    const pluginDefine = await pluginStore.getPluginDefine(stepType);
    // let pluginDefine = pluginGroups.get(stepType);
    if (pluginDefine == null) {
      console.log("插件未找到", stepType);
      return;
    }
    // pluginDefine = _.cloneDeep(pluginDefine);
    const columns = pluginDefine.input;
    for (let key in columns) {
      const column = columns[key];
      useReference(column);
    }

    currentPluginDefine.value = pluginDefine;

    for (let key in pluginDefine.input) {
      const column = pluginDefine.input[key];
      //设置初始值
      if ((column.default != null || column.value != null) && currentStep.input[key] == null) {
        currentStep.input[key] = column.default ?? column.value;
      }
    }
    //设置系统初始值，必须放在这里设置，保证最新的系统值被清空后，这里也能跟着清空
    const pluginSysConfig = await pluginStore.getPluginConfig({ name: pluginDefine.name, type: pluginDefine.type });
    if (pluginSysConfig.sysSetting?.input) {
      for (const key in pluginSysConfig.sysSetting?.input) {
        currentStep.input[key] = pluginSysConfig.sysSetting?.input[key];
      }
    }
  };

  const stepSave = async (e: any) => {
    try {
      await stepFormRef.value.validate();
    } catch (e) {
      console.error("表单验证失败:", e);
      return;
    }

    // currentStep 是复用同一份 reactive 对象，直接传给回调会被 task.steps 保存同一引用，
    // 后续再次 stepOpen 会 delete 掉其属性，导致已保存的步骤（如第一个步骤）被覆盖。
    // 这里深拷贝一份再传出，保证每个步骤是独立对象。
    callback.value("save", cloneDeep(currentStep));
    stepDrawerClose();
  };

  const stepDelete = () => {
    //检查输出依赖

    Modal.confirm({
      title: t("certd.pipeline.editor.confirmTitle"),
      content: t("certd.pipeline.editor.confirmDeleteStep"),
      async onOk() {
        callback.value("delete");
        stepDrawerClose();
      },
    });
  };

  const stepCopy = () => {
    const step = cloneDeep(currentStep);
    step.id = nanoid();
    step.title = `${step.title}-copy`;
    callback.value("copy", step);
    stepDrawerClose();
  };

  const getScopeFunc = () => {
    return currentStepScope;
  };

  const pluginSourceActive = ref("local");
  const handlePluginConfirm = async (item: any) => {
    stepTypeSelected(item);
    await stepTypeSave();
  };

  const handleOnlinePluginUninstalled = (plugin: any) => {
    if (currentStep.type === plugin.fullName) {
      currentStep.type = undefined;
      currentStep.title = t("certd.pipeline.editor.newTask");
    }
  };

  return {
    pluginSourceActive,
    stepTypeSelected,
    handlePluginConfirm,
    handleOnlinePluginUninstalled,
    stepTypeSave,
    stepTypeConfirm,
    stepFormRef,
    mode,
    stepAdd,
    stepEdit,
    stepView,
    stepDrawerShow,
    stepDrawerVisible,
    currentStep,
    currentPlugin,
    stepSave,
    stepDelete,
    rules,
    getScopeFunc,
    stepCopy,
    fullscreen,
  };
}

const runStrategyProps = ref({
  title: t("certd.pipeline.editor.runStrategy"),
  key: "strategy.runStrategy",
  component: {
    name: "a-select",
    vModel: "value",
    options: [
      { value: 0, label: t("certd.pipeline.editor.runStrategyNormal") },
      { value: 1, label: t("certd.pipeline.editor.runStrategySkip") },
    ],
  },
  helper: {
    render: () => {
      return (
        <div>
          <div class="color-green">{t("certd.pipeline.editor.runStrategyDefault")}</div>
          <div>{t("certd.pipeline.editor.runStrategyNormalHelp")}</div>
          <div>{t("certd.pipeline.editor.runStrategySkipHelp")}</div>
        </div>
      );
    },
  },
  rules: [{ required: true, message: t("certd.pipeline.editor.required") }],
});

const labelCol = ref({ span: 6 });
const wrapperCol = ref({ span: 16 });

const stepFormRes = useStepForm();
const {
  pluginSourceActive,
  stepTypeSelected,
  handlePluginConfirm,
  handleOnlinePluginUninstalled,
  stepTypeSave,
  stepFormRef,
  stepDrawerVisible,
  currentStep,
  currentPlugin,
  stepSave,
  stepDelete,
  getScopeFunc,
  fullscreen,
} = stepFormRes;
defineExpose({
  ...stepFormRes,
});
</script>

<style lang="less">
.step-form-drawer {
  max-width: 100%;

  .ant-drawer-content-wrapper {
    max-width: 100vw;
  }

  .ant-tabs-nav .ant-tabs-tab {
    margin-top: 10px !important;
    padding: 8px 14px !important;
  }

  &.fullscreen {
    .pi-step-form {
      .body {
        margin: auto;

        .step-form {
          display: flex;
          flex-wrap: wrap;
          width: 1500px;

          .fs-form-item {
            width: 100%;
          }
        }
      }

      .footer {
        .bottom-button {
          text-align: center;
        }
      }
    }
  }

  .ant-drawer-body {
    padding: 10px;
  }

  .pi-step-form {
    .ant-tabs-content {
      height: 100%;
    }
    .step-plugin-source-pane-local,
    .step-plugin-source-pane-online {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
    }

    .step-plugin-search {
      flex: none;
      padding: 0 0 12px;
    }

    .step-plugin-selector-tabs {
      min-height: 0;

      > .ant-tabs-nav {
        width: 136px;
        flex: 0 0 136px;
        overflow: hidden;
      }

      > .ant-tabs-nav .ant-tabs-nav-wrap,
      > .ant-tabs-nav .ant-tabs-nav-list {
        width: 100%;
      }

      > .ant-tabs-nav .ant-tabs-tab {
        width: 100%;
        box-sizing: border-box;
      }

      .cd-step-form-tab-label {
        display: flex;
        align-items: center;
        width: 100%;
        min-width: 0;

        .fs-icon {
          display: flex;
          align-items: center;
          color: #00b7ff;

          svg {
            vertical-align: middle !important;
            display: flex;
            align-items: center;
          }
        }

        > div:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      > .ant-tabs-content-holder {
        min-width: 0;
        min-height: 0;
        flex: 1;
        overflow-x: hidden;
        overflow-y: auto;
        padding-right: 10px;
      }

      > .ant-tabs-content-holder > .ant-tabs-content {
        height: auto;
        min-height: 100%;
      }

      > .ant-tabs-content-holder > .ant-tabs-content > .ant-tabs-tabpane {
        padding-right: 0 !important;
        overflow: visible !important;
      }
    }

    .bottom-button {
      padding: 20px;
      padding-bottom: 5px;
      margin-left: 100px;
    }

    .body {
      padding: 0px;
    }
  }
}
</style>
