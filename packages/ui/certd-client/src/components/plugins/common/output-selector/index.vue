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
      default: undefined,
    },
    // eslint-disable-next-line vue/require-default-prop
    from: {
      type: [String, Array],
    },
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
        currentTask: currentTask.value,
      });
      const _certApply = pluginGroups?.groups?.cert?.plugins?.map((item: any) => item.name) || [];
      const _fromProps = props.from ? (typeof props.from === "string" ? [props.from] : props.from) : [];
      options.value = options.value.filter((item: any) => _certApply?.includes?.(item.type) || _fromProps.includes(item.type));

      if (props.modelValue != null) {
        const found = options.value.find((item: any) => item.value === props.modelValue);
        if (!found) {
          ctx.emit("update:modelValue", undefined);
        }
      } else {
        const value = options.value.length > 0 ? options.value[0].value : undefined;
        ctx.emit("update:modelValue", value);
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
      onChanged,
    };
  },
};
</script>

<style lang="less"></style>
