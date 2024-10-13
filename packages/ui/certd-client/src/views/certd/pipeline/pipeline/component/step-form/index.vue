<template>
  <a-drawer v-model:open="stepDrawerVisible" placement="right" :closable="true" width="700px" class="step-form-drawer" :class="{ fullscreen }">
    <template #title>
      <div>
        编辑步骤
        <template v-if="editMode">
          <a-button @click="stepDelete()">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </template>
      </div>
      <div>
        <fs-icon
          class="icon-button"
          :icon="fullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'"
          @click="fullscreen = !fullscreen"
        ></fs-icon>
      </div>
    </template>
    <template v-if="currentStep">
      <pi-container v-if="currentStep._isAdd" class="pi-step-form">
        <template #header>
          <a-row :gutter="10" class="mb-10">
            <a-col :span="24" style="padding-left: 20px">
              <a-input-search v-model:value="pluginSearch.keyword" placeholder="搜索插件" :allow-clear="true" :show-search="true"></a-input-search>
            </a-col>
          </a-row>
        </template>
        <div class="flex-col h-100 w-100 overflow-hidden">
          <a-tabs v-model:active-key="pluginGroupActive" tab-position="left" class="flex-1 overflow-hidden">
            <a-tab-pane v-for="group of computedPluginGroups" :key="group.key" :tab="group.title" class="scroll-y">
              <a-row v-if="!group.plugins || group.plugins.length === 0" :gutter="10">
                <a-col class="flex-o">
                  <div class="flex-o m-10">没有找到插件</div>
                </a-col>
              </a-row>
              <a-row v-else :gutter="10">
                <a-col v-for="item of group.plugins" :key="item.key" class="step-plugin">
                  <a-card
                    hoverable
                    :class="{ current: item.name === currentStep.type }"
                    @click="stepTypeSelected(item)"
                    @dblclick="
                      stepTypeSelected(item);
                      stepTypeSave();
                    "
                  >
                    <a-card-meta>
                      <template #title>
                        <fs-icon class="plugin-icon" :icon="item.icon || 'clarity:plugin-line'"></fs-icon>
                        <span class="title">{{ item.title }}</span>
                        <vip-button v-if="item.needPlus" mode="icon" />
                      </template>
                      <template #description>
                        <span :title="item.desc">{{ item.desc }}</span>
                      </template>
                    </a-card-meta>
                  </a-card>
                </a-col>
              </a-row>
            </a-tab-pane>
          </a-tabs>
        </div>
        <template #footer>
          <div style="padding: 20px; margin-left: 100px">
            <a-button v-if="editMode" type="primary" @click="stepTypeSave"> 确定 </a-button>
          </div>
        </template>
      </pi-container>
      <pi-container v-else class="pi-step-form">
        <template #header>
          <div class="mb-10">
            <a-alert type="info" :message="currentPlugin.title" :description="currentPlugin.desc"> </a-alert>
          </div>
        </template>
        <div class="w-100 h-100">
          <a-form ref="stepFormRef" class="step-form" :model="currentStep" :label-col="labelCol" :wrapper-col="wrapperCol">
            <fs-form-item
              v-model="currentStep.title"
              :item="{
                title: '任务名称',
                key: 'title',
                component: {
                  name: 'a-input',
                  vModel: 'value'
                },
                rules: [{ required: true, message: '此项必填' }]
              }"
              :get-context-fn="blankFn"
            />
            <template v-for="(item, key) in currentPlugin.input" :key="key">
              <fs-form-item v-if="item.show !== false" v-model="currentStep.input[key]" :item="item" :get-context-fn="blankFn" />
            </template>

            <fs-form-item v-model="currentStep.strategy.runStrategy" :item="runStrategyProps" :get-context-fn="blankFn" />
          </a-form>
        </div>
        <template #footer>
          <div v-if="editMode" class="bottom-button">
            <a-button type="primary" @click="stepSave"> 确定 </a-button>
          </div>
        </template>
      </pi-container>
    </template>
  </a-drawer>
</template>

<script lang="tsx">
import { message, Modal } from "ant-design-vue";
import { computed, inject, Ref, ref, watch } from "vue";
import _ from "lodash-es";
import { nanoid } from "nanoid";
import { CopyOutlined } from "@ant-design/icons-vue";
import { PluginGroups } from "/@/views/certd/pipeline/pipeline/type";
import { useUserStore } from "/@/store/modules/user";
import { compute, useCompute } from "@fast-crud/fast-crud";
import { useReference } from "/@/use/use-refrence";
import { useSettingStore } from "/@/store/modules/settings";
import * as pluginApi from "../../../api.plugin";
export default {
  name: "PiStepForm",
  // eslint-disable-next-line vue/no-unused-components
  components: { CopyOutlined },
  props: {
    editMode: {
      type: Boolean,
      default: true
    }
  },
  emits: ["update"],
  setup(props: any, context: any) {
    /**
     *  step drawer
     * @returns
     */
    function useStepForm() {
      const settingStore = useSettingStore();
      const getPluginGroups: any = inject("getPluginGroups");
      const pluginGroups: PluginGroups = getPluginGroups();
      const mode: Ref = ref("add");
      const callback: Ref = ref();
      const currentStep: Ref = ref({ title: undefined, input: {} });
      const stepFormRef: Ref = ref(null);
      const stepDrawerVisible: Ref = ref(false);
      const fullscreen: Ref<boolean> = ref(false);
      const rules: Ref = ref({
        name: [
          {
            type: "string",
            required: true,
            message: "请输入名称"
          }
        ]
      });

      const stepTypeSelected = (item: any) => {
        if (item.needPlus && !settingStore.isPlus) {
          message.warn("此插件需要开通专业版才能使用");
          throw new Error("此插件需要开通专业版才能使用");
        }
        currentStep.value.type = item.name;
        currentStep.value.title = item.title;
        console.log("currentStepTypeChanged:", currentStep.value);
      };

      const stepTypeSave = async () => {
        currentStep.value._isAdd = false;
        if (currentStep.value.type == null) {
          message.warn("请先选择类型");
          return;
        }

        // 给step的input设置默认值
        await changeCurrentPlugin(currentStep.value);

        //合并默认值
        _.merge(currentStep.value, { input: {}, strategy: { runStrategy: 0 } }, currentPlugin.value.default, currentStep.value);
      };

      const stepDrawerShow = () => {
        stepDrawerVisible.value = true;
      };
      const stepDrawerClose = () => {
        stepDrawerVisible.value = false;
      };

      const stepOpen = (step: any, emit: any) => {
        callback.value = emit;
        currentStep.value = _.merge({ input: {}, strategy: {} }, step);

        if (step.type) {
          changeCurrentPlugin(currentStep.value);
        }
        stepDrawerShow();
      };

      const stepAdd = (emit: any, stepDef: any) => {
        mode.value = "add";
        const step: any = {
          id: nanoid(),
          title: "新任务",
          type: undefined,
          _isAdd: true,
          input: {},
          status: null
        };
        _.merge(step, stepDef);
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

      function getContext() {
        return {
          form: currentStep.value.input
        };
      }
      const { doComputed } = useCompute();
      const currentPlugin = doComputed(() => {
        return currentPluginDefine.value;
      }, getContext);
      const changeCurrentPlugin = async (step: any) => {
        const stepType = step.type;
        step.type = stepType;
        step._isAdd = false;

        let pluginDefine = pluginGroups.get(stepType);
        if (pluginDefine == null) {
          console.log("插件未找到", stepType);
          return;
        }
        pluginDefine = _.cloneDeep(pluginDefine);
        const columns = pluginDefine.input;
        for (let key in columns) {
          const column = columns[key];
          useReference(column);
        }

        currentPluginDefine.value = pluginDefine;

        for (let key in pluginDefine.input) {
          const column = pluginDefine.input[key];
          //设置初始值
          if ((column.default != null || column.value != null) && currentStep.value.input[key] == null) {
            currentStep.value.input[key] = column.default ?? column.value;
          }
        }
        //设置系统初始值
        debugger;
        const pluginSysConfig = await pluginApi.GetPluginConfig({ name: pluginDefine.name, type: "builtIn" });
        if (pluginSysConfig.sysSetting?.input) {
          for (const key in pluginSysConfig.sysSetting?.input) {
            currentStep.value.input[key] = pluginSysConfig.sysSetting?.input[key];
          }
        }

        console.log("currentStepTypeChanged:", currentStep.value);
        console.log("currentStepPlugin:", currentPlugin.value);
      };

      const stepSave = async (e: any) => {
        console.log("currentStepSave", currentStep.value);
        try {
          await stepFormRef.value.validate();
        } catch (e) {
          console.error("表单验证失败:", e);
          return;
        }

        callback.value("save", currentStep.value);
        stepDrawerClose();
      };

      const stepDelete = () => {
        Modal.confirm({
          title: "确认",
          content: `确定要删除此步骤吗？`,
          async onOk() {
            callback.value("delete");
            stepDrawerClose();
          }
        });
      };

      const stepCopy = () => {
        const step = _.cloneDeep(currentStep.value);
        step.id = nanoid();
        step.title = `${step.title}-copy`;
        callback.value("copy", step);
        stepDrawerClose();
      };

      const blankFn = () => {
        return {};
      };

      const pluginSearch = ref({
        keyword: "",
        result: []
      });
      const pluginGroupActive = ref("all");
      const computedPluginGroups: any = computed(() => {
        const groups = pluginGroups.groups;
        if (pluginSearch.value.keyword) {
          const keyword = pluginSearch.value.keyword.toLowerCase();
          const list = groups.all.plugins.filter((plugin) => {
            return (
              plugin.title?.toLowerCase().includes(keyword) || plugin.desc?.toLowerCase().includes(keyword) || plugin.name?.toLowerCase().includes(keyword)
            );
          });
          return {
            search: { key: "search", title: "搜索结果", plugins: list }
          };
        } else {
          return groups;
        }
      });
      watch(
        () => {
          return pluginSearch.value.keyword;
        },
        (val: any) => {
          if (val) {
            pluginGroupActive.value = "search";
          } else {
            pluginGroupActive.value = "all";
          }
        }
      );

      return {
        pluginGroupActive,
        computedPluginGroups,
        pluginSearch,
        stepTypeSelected,
        stepTypeSave,
        pluginGroups,
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
        blankFn,
        stepCopy,
        fullscreen
      };
    }

    const runStrategyProps = ref({
      title: "运行策略",
      key: "strategy.runStrategy",
      component: {
        name: "a-select",
        vModel: "value",
        options: [
          { value: 0, label: "正常运行（证书申请任务请选择它）" },
          { value: 1, label: "成功后跳过（非证书任务请选择它）" }
        ]
      },
      helper: {
        render: () => {
          return (
            <div>
              <div>正常运行：每次都运行，证书任务需要每次都运行</div>
              <div>成功后跳过：在证书没变化时，该任务成功一次之后跳过，不重复部署</div>
              <div>保持默认即可，如果你想要再次测试部署，可以临时设置为正常运行</div>
            </div>
          );
        }
      },
      rules: [{ required: true, message: "此项必填" }]
    });

    return {
      ...useStepForm(),
      labelCol: { span: 6 },
      wrapperCol: { span: 16 },
      runStrategyProps
    };
  }
};
</script>

<style lang="less">
.step-form-drawer {
  &.fullscreen {
    .pi-step-form {
      .body {
        margin: auto;
        .step-plugin {
          width: 16.666666%;
        }
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

  .pi-step-form {
    .bottom-button {
      padding: 20px;
      padding-bottom: 5px;
      margin-left: 100px;
    }

    .plugin-icon {
      font-size: 22px;
      color: #00b7ff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .body {
      padding: 0px;

      .step-plugin {
        width: 50%;
      }

      .ant-tabs-content {
        height: 100%;
      }
      .ant-tabs-tabpane {
        padding-right: 10px;
        overflow-y: auto;
        overflow-x: hidden;
      }
      .ant-card {
        margin-bottom: 10px;

        &.current {
          border-color: #00b7ff;
        }

        .ant-card-meta-title {
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
        }

        .ant-avatar {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .title {
          margin-left: 5px;
          white-space: nowrap;
          flex: 1;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .ant-card-body {
        padding: 14px;
        height: 100px;

        overflow-y: hidden;

        .ant-card-meta-description {
          font-size: 12px;
          line-height: 20px;
          height: 40px;
          color: #7f7f7f;
        }
      }
    }
  }
}
</style>
