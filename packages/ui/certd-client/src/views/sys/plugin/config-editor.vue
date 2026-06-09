<template>
  <div class="plugin-config">
    <div class="origin-metadata w-100%">
      <div class="block-title">
        自定义插件参数配置
        <div class="helper">可以设置插件选项的配置，设置配置默认值、修改帮助说明、设置是否显示该字段等，在用户申请证书对话框里面使用你自定义设置的展示效果</div>
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
                <template v-for="prop in getEditableKeys(item)" :key="prop.key">
                  <tr>
                    <td v-if="prop.key === 'value'" class="border-t-2 p-5" :rowspan="getEditableKeys(item).length" :class="{ 'border-t-2': prop.key === 'value' }">{{ item.title }}</td>
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
import { dict, FsRender } from "@fast-crud/fast-crud";
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

const showDict = dict({
  data: [
    {
      value: true,
      label: "显示",
    },
    {
      value: false,
      label: "不显示",
    },
  ],
});
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
        let showType = "";
        let color = "";
        if (item.mergeScript?.indexOf("show:") >= -1) {
          showType = "条件显示";
          color = "orange";
        } else {
          showType = value === false ? "不显示" : "显示";
          color = value === false ? "red" : "green";
        }
        return (
          <a-tag color={color} size="small">
            {showType}
          </a-tag>
        );
      };
    },
    editRender(item: any) {
      return () => {
        return <fs-dict-switch vModel:checked={configForm[item.key]["show"]} dict={showDict} />;
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

const optionsMappingKey = {
  key: "optionsMapping",
  label: "选项映射",
  onSet(item: any) {
    configForm[item.key]["optionsMapping"] = item.optionsMapping ?? null;
  },
  defaultRender(item: any) {
    return () => {
      const mapping = item["optionsMapping"];
      if (!mapping || Object.keys(mapping).length === 0) {
        return <span class="text-gray-400">未设置</span>;
      }
      return (
        <div class="options-mapping-tags">
          {Object.entries(mapping).map(([key, label]: any) => (
            <a-tag color="blue" size="small" class="mb-2 mr-2">
              {key} → {label}
            </a-tag>
          ))}
        </div>
      );
    };
  },
  editRender(item: any) {
    return () => {
      const options = item.component?.options || [];
      if (options.length === 0) {
        return <span class="text-gray-400">该组件没有预设选项</span>;
      }

      const onLabelChange = (optValue: string, newLabel: string) => {
        const mapping = configForm[item.key]["optionsMapping"] || {};
        if (newLabel) {
          mapping[optValue] = newLabel;
          configForm[item.key]["optionsMapping"] = { ...mapping };
        } else {
          delete mapping[optValue];
          if (Object.keys(mapping).length > 0) {
            configForm[item.key]["optionsMapping"] = { ...mapping };
          } else {
            delete configForm[item.key]["optionsMapping"];
          }
        }
      };

      const getLabel = (optValue: string) => {
        return configForm[item.key]["optionsMapping"]?.[optValue] || "";
      };

      return (
        <div class="options-mapping-editor">
          <table class="w-full table-auto border-collapse border border-gray-300 text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="border border-gray-300 px-2 py-1 text-left">选项值</th>
                <th class="border border-gray-300 px-2 py-1 text-left">原始显示</th>
                <th class="border border-gray-300 px-2 py-1 text-left">自定义显示</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt: any) => (
                <tr>
                  <td class="border border-gray-300 px-2 py-1">
                    <code class="text-xs">{opt.value}</code>
                  </td>
                  <td class="border border-gray-300 px-2 py-1 text-gray-500">{opt.label}</td>
                  <td class="border border-gray-300 px-2 py-1">
                    <a-input size="small" placeholder={opt.label} value={getLabel(opt.value)} onUpdate:value={(val: string) => onLabelChange(opt.value, val)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div class="helper mt-1">只需填写需要自定义的选项，留空则使用原始显示内容</div>
        </div>
      );
    };
  },
};

function getEditableKeys(item: any) {
  if (item.component?.name === "a-select" || item.component?.name === "icon-select") {
    return [...editableKeys.value, optionsMappingKey];
  }
  return editableKeys.value;
}
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
