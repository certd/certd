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
    },
    from: {
      type: String
    }
  },
  emits: ["update:modelValue"],
  setup(props: any, ctx: any) {
    const options = ref<any[]>([]);

    const pipeline = inject("pipeline") as Ref<any>;
    const currentStageIndex = inject("currentStageIndex") as Ref<number>;
    const currentStepIndex = inject("currentStepIndex") as Ref<number>;
    const currentTask = inject("currentTask") as Ref<any>;

    const getPluginGroups = inject("getPluginGroups") as any;
    const pluginGroups = getPluginGroups();
    function onCreate() {
      options.value = pluginGroups.getPreStepOutputOptions({
        pipeline: pipeline.value,
        currentStageIndex: currentStageIndex.value,
        currentStepIndex: currentStepIndex.value,
        currentTask: currentTask.value
      });
      if (props.from) {
        options.value = options.value.filter((item: any) => item.type === props.from);
      }
      if (props.modelValue == null && options.value.length > 0) {
        ctx.emit("update:modelValue", options.value[0].value);
      }
    }
    onMounted(() => {
      onCreate();
    });

    watch(
      () => {
        return pluginGroups.value?.map;
      },
      () => {
        onCreate();
      }
    );

    function onChanged(value: any) {
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
