<template>
  <a-form ref="formRef" class="template-form w-full" :model="templateForm" :label-col="labelCol" :wrapper-col="wrapperCol">
    <template v-for="(item, key) in templateFormColumns" :key="key">
      <fs-form-item v-if="item.show !== false" :model-value="get(templateForm, key)" :item="item" :get-context-fn="getScopeFunc(key)" @update:model-value="set(templateForm, key, $event)" />
    </template>
  </a-form>
</template>
<script setup lang="ts">
import { get, set } from "lodash-es";
import { computed, reactive, ref } from "vue";
import { useStepHelper } from "./utils";
import { usePluginStore } from "/@/store/plugin";

defineOptions({
  name: "TemplateForm",
});
const formRef = ref();
const props = defineProps<{
  input: any;
  pipeline: any;
}>();
const pluginStore = usePluginStore();
const { getStepsMap } = useStepHelper(pluginStore);
const steps = computed(() => {
  if (!props.pipeline) {
    return {};
  }
  return getStepsMap(props.pipeline);
});

const labelCol = ref({
  span: null,
  style: {
    width: "145px",
  },
});
const wrapperCol = ref({ span: 16 });
const templateForm: any = reactive({});
const templateFormColumns = computed(() => {
  const formColumns: any = {};
  const inputs = props.input || {};
  for (const inputKey in inputs) {
    const [stepId, key] = inputKey.split(".");
    const step = steps.value[stepId];
    if (!step) {
      continue;
    }
    formColumns[inputKey] = {
      ...step.input[key].define,
      name: [stepId, key],
    };
  }
  return formColumns;
});
function getScopeFunc(inputKey: string) {
  const [stepId, key] = inputKey.split(".");
  return () => {
    return {
      form: templateForm[stepId],
    };
  };
}

async function validate() {
  return await formRef.value.validate();
}

defineExpose({
  getForm() {
    return templateForm;
  },
  validate,
});
</script>
