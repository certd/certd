<template>
  <a-select class="output-selector" :value="modelValue" :options="options" @update:value="onChanged"> </a-select>
</template>

<script lang="ts">
import { inject, onMounted, Ref, ref, watch } from "vue";
import { usePluginStore } from "/@/store/plugin";

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

    const pluginStore = usePluginStore();

    async function onCreate() {
      await pluginStore.init();
      options.value = pluginStore.group.getPreStepOutputOptions({
        pipeline: pipeline?.value,
        currentStageIndex: currentStageIndex.value,
        currentTaskIndex: currentTaskIndex.value,
        currentStepIndex: currentStepIndex.value,
        currentTask: currentTask.value,
      });
      if (props.from) {
        let froms = [];
        if (typeof props.from === "string") {
          froms = [props.from];
        } else {
          froms = props.from;
        }
        function match(from: string, item: any) {
          // pluginType:valueType:keyName
          if (from.includes(":")) {
            const [pluginType, valueType, keyName] = from.split(":");
            if (pluginType && item.type !== pluginType) {
              return false;
            }
            if (valueType && item.valueType !== valueType) {
              return false;
            }
            if (keyName && item.key !== keyName) {
              return false;
            }
            return true;
          } else {
            return item.type === from;
          }
        }
        options.value = options.value.filter((item: any) => {
          for (const from of froms) {
            if (match(from, item)) {
              return true;
            }
          }
          return false;
        });
      }

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
    onMounted(async () => {
      await onCreate();
    });

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
