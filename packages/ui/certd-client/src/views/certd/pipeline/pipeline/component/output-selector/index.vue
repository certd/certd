<template>
  <a-select class="pi-output-selector" :value="modelValue" :options="options" @update:value="onChanged"> </a-select>
</template>

<script lang="ts">
import { inject, onMounted, Ref, ref, watch } from "vue";
import { pluginManager } from "../../plugin";

export default {
  name: "PiOutputSelector",
  props: {
    modelValue: {
      type: String,
      default: undefined
    }
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const options = ref<any[]>([]);

    const pipeline = inject("pipeline") as Ref<any>;
    const currentStageIndex = inject("currentStageIndex") as Ref<number>;
    const currentStepIndex = inject("currentStepIndex") as Ref<number>;
    const currentTask = inject("currentTask") as Ref<any>;

    function onCreate() {
      options.value = pluginManager.getPreStepOutputOptions({
        pipeline: pipeline.value,
        currentStageIndex: currentStageIndex.value,
        currentStepIndex: currentStepIndex.value,
        currentTask: currentTask.value
      });
      if (props.modelValue == null && options.value.length > 0) {
        ctx.emit("update:modelValue", options.value[0].value);
      }
    }
    onMounted(() => {
      onCreate();
    });

    watch(
      () => {
        return pluginManager.map;
      },
      () => {
        onCreate();
      }
    );

    function onChanged(value) {
      ctx.emit("update:modelValue", value);
    }
    return {
      options,
      onChanged
    };
  }
};
</script>

<style lang="less"></style>
