<template>
  <a-select class="output-selector" :value="modelValue" :options="options" @update:value="onChanged"> </a-select>
</template>

<script lang="ts">
import { inject, onMounted, Ref, ref, watch } from "vue";

export default {
  name: "OutputSelector",
  props: {
    modelValue: {
      type: String,
      default: undefined
    },
    // eslint-disable-next-line vue/require-default-prop
    from: {
      type: [String, Array]
    }
  },
  emits: ["update:modelValue"],
  setup(props: any, ctx: any) {
    const options = ref<any[]>([]);

    const pipeline = inject("pipeline") as Ref<any>;
    const currentStageIndex = inject("currentStageIndex") as Ref<number>;
    const currentTaskIndex = inject("currentTaskIndex") as Ref<number>;
    const currentStepIndex = inject("currentStepIndex") as Ref<number>;
    const currentTask = inject("currentTask") as Ref<any>;

    const getPluginGroups = inject("getPluginGroups") as any;
    const pluginGroups = getPluginGroups();
    function onCreate() {
      options.value = pluginGroups.getPreStepOutputOptions({
        pipeline: pipeline.value,
        currentStageIndex: currentStageIndex.value,
        currentTaskIndex: currentTaskIndex.value,
        currentStepIndex: currentStepIndex.value,
        currentTask: currentTask.value
      });
      if (props.from) {
        if (typeof props.from === "string") {
          options.value = options.value.filter((item: any) => item.type === props.from);
        } else {
          options.value = options.value.filter((item: any) => props.from.includes(item.type));
        }
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
