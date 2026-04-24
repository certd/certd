<template>
  <div class="plugin-config">
    <div class="origin-metadata w-100%">
      <div class="block-title">
        自定义插件参数配置
        <div class="helper">可以设置插件选项的配置，设置配置默认值、修改帮助说明、设置是否显示该字段等</div>
      </div>
      <div class="p-10">
        <div ref="formRef" class="config-form w-full" :label-col="labelCol" :wrapper-col="wrapperCol">
          <table class="table-fixed w-full">
            <thead>
              <tr>
                <th class="text-left p-5" width="200px">插件参数</th>
                <th class="text-left p-5" width="100px">参数配置</th>
                <th class="text-left flex-1 p-5">自定义</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in originInputs" :key="item.key">
                <template v-for="prop in editableKeys" :key="prop.key">
                  <tr>
                    <td v-if="prop.key === 'value'" class="border-t-2 p-5" rowspan="3" :class="{ 'border-t-2': prop.key === 'value' }">{{ item.title }}</td>
                    <td class="border-t p-5" :class="{ 'border-t-2': prop.key === 'value' }">{{ prop.label }}</td>
                    <td class="border-t p-5" :class="{ 'border-t-2': prop.key === 'value' }">
                      <rollbackable :value="configForm[item.key][prop.key]" @set="prop.onSet(item)" @clear="delete configForm[item.key][prop.key]">
                        <template #default>
                          <fs-render :render-func="prop.defaultRender(item)"></fs-render>
                        </template>
                        <template #edit>
                          <fs-render :render-func="prop.editRender(item)"></fs-render>
                        </template>
                      </rollbackable>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { FsRender } from "@fast-crud/fast-crud";
import { cloneDeep, merge, unset } from "lodash-es";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Rollbackable from "./rollbackable.vue";
import { usePluginStore } from "/@/store/plugin";
const route = useRoute();
const router = useRouter();
const pluginStore = usePluginStore();
const props = defineProps<{
  plugin: any;
}>();

const pluginMetadata = ref<any>("");
const currentPlugin = ref();
const labelCol = ref({
  span: null,
  style: {
    width: "145px",
  },
});
const wrapperCol = ref({ span: 16 });
const configForm: any = reactive({});

function getScope() {
  return {
    form: configForm,
  };
}

function getForm() {
  return configForm;
}

const editableKeys = ref([
  {
    key: "value",
    label: "默认值",
    onSet(item: any) {
      configForm[item.key]["value"] = item.value ?? null;
    },
    defaultRender(item: any) {
      return () => {
        return item["value"] ?? "";
      };
    },
    editRender(item: any) {
      return () => {
        return <fs-component-render {...item.component} vModel:modelValue={configForm[item.key]["value"]} scope={getScope()} />;
      };
    },
  },
  {
    key: "show",
    label: "是否显示",
    onSet(item: any) {
      configForm[item.key]["show"] = item.show ?? true;
    },
    defaultRender(item: any) {
      return () => {
        const value = item["show"];
        return value === false ? "不显示" : "显示";
      };
    },
    editRender(item: any) {
      return () => {
        return <a-switch vModel:checked={configForm[item.key]["show"]} />;
      };
    },
  },
  {
    key: "helper",
    label: "帮助说明",
    onSet(item: any) {
      configForm[item.key]["helper"] = item.helper ?? "";
    },
    defaultRender(item: any) {
      return () => {
        return <pre class={"helper pre"}>{item["helper"]}</pre>;
      };
    },
    editRender(item: any) {
      return () => {
        return <a-textarea rows={5} vModel:value={configForm[item.key]["helper"]} />;
      };
    },
  },
]);

const originInputs = computed(() => {
  if (!currentPlugin.value) {
    return;
  }
  const input = cloneDeep(currentPlugin.value.input);
  const newInputs: any = {};

  for (const key in input) {
    const value = input[key];
    value.key = key;
    const newInput: any = cloneDeep(value);
    newInputs[key] = newInput;
  }
  return newInputs;
});

function clearFormValue(key: string) {
  unset(configForm, key);
  console.log(key, configForm);
}

async function loadPluginSetting() {
  currentPlugin.value = await pluginStore.getPluginDefineFromOrigin(props.plugin.name);
  for (const key in currentPlugin.value.input) {
    configForm[key] = {};
  }
  const setting = props.plugin.sysSetting;
  if (setting) {
    const settingJson = JSON.parse(setting);
    merge(configForm, settingJson.metadata?.input || {});
  }
}

onMounted(async () => {
  await loadPluginSetting();
});

defineExpose({
  getForm,
});
</script>

<style lang="less">
.plugin-config {
  pre {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  }
}
</style>
