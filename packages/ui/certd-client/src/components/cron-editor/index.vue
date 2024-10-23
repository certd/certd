<template>
  <div class="cron-editor">
    <div class="flex-o">
      <cron-light
        :disabled="disabled"
        :readonly="readonly"
        :period="period"
        class="flex-o cron-ant"
        locale="zh-CN"
        format="quartz"
        :model-value="modelValue"
        @update:model-value="onUpdate"
        @error="onError"
      />
    </div>
    <div class="mt-5">
      <a-input :disabled="true" :readonly="readonly" :value="modelValue" @change="onChange"></a-input>
    </div>
    <div class="helper">下次触发时间：{{ nextTime }}</div>
    <div class="fs-helper">{{ errorMessage }}</div>
  </div>
</template>

<script lang="ts" setup>
import parser from "cron-parser";
import { computed, ref } from "vue";
import dayjs from "dayjs";
defineOptions({
  name: "CronEditor"
});
const props = defineProps<{
  modelValue?: string;
  disabled?: boolean;
  readonly?: boolean;
}>();

const period = ref<string>("");
if (props.modelValue == null) {
  period.value = "day";
}
const emit = defineEmits<{
  "update:modelValue": any;
}>();

const errorMessage = ref<string | null>(null);

const onUpdate = (value: string) => {
  if (value === props.modelValue) {
    return;
  }
  emit("update:modelValue", value);
  errorMessage.value = undefined;
};

const onPeriod = (value: string) => {
  period.value = value;
};

const onChange = (e: any) => {
  const value = e.target.value;
  onUpdate(value);
};
const onError = (error: any) => {
  errorMessage.value = error;
};

const nextTime = computed(() => {
  try {
    const interval = parser.parseExpression(props.modelValue);
    const next = interval.next().getTime();
    return dayjs(next).format("YYYY-MM-DD HH:mm:ss");
  } catch (e) {
    console.log(e);
    return "请先设置正确的cron表达式";
  }
});
</script>
<style lang="less">
.cron-editor {
  .cron-ant {
    flex-wrap: wrap;
    &* > {
      margin-bottom: 2px;
      display: flex;
      align-items: center;
    }
    .vcron-select-list {
      min-width: 56px;
    }
    .vcron-select-input {
      min-height: 22px;
      background-color: #fff;
    }
    .vcron-select-container {
      display: flex;
      align-items: center;
    }
  }
}
</style>
