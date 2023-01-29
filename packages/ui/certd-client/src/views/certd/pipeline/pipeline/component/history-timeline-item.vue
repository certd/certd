<template>
  <a-timeline-item v-if="status && runnable" class="pi-history-timeline-item" :color="status.color">
    <template #dot>
      <fs-icon v-bind="status" />
    </template>
    <p>
      <fs-date-format :model-value="runnable.status?.startTime"></fs-date-format>
      <a-tag class="ml-10" :color="status.color">{{ status.label }}</a-tag>

      <a-tag v-if="isCurrent" class="pointer" color="green" :closable="true" @close="cancel">当前</a-tag>
      <a-tag v-else-if="!editMode" class="pointer" color="blue" @click="view">查看</a-tag>
    </p>
  </a-timeline-item>
</template>

<script lang="ts">
import { defineComponent, ref, provide, Ref, watch, computed } from "vue";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
export default defineComponent({
  name: "PiHistoryTimelineItem",
  props: {
    runnable: {
      type: Object,
      default() {
        return {};
      }
    },
    type: {
      type: String,
      default: "icon"
    },
    isCurrent: {
      type: Boolean
    },
    editMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ["view", "cancel"],
  setup(props, ctx) {
    const status = computed(() => {
      return statusUtil.get(props.runnable?.status?.result);
    });

    function view() {
      ctx.emit("view");
    }
    function cancel() {
      ctx.emit("cancel");
    }
    return {
      status,
      cancel,
      view
    };
  }
});
</script>
<style lang="less">
.pi-history-timeline-item {
  .ant-tag.pointer {
    cursor: pointer;
  }
}
</style>
