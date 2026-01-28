<template>
  <a-timeline-item v-if="status && runnable" class="pi-history-timeline-item" :color="status.iconColor || status.color">
    <template #dot>
      <fs-icon v-bind="status" :color="status.iconColor || status.color" />
    </template>
    <p class="flex items-center">
      <TriggerIcon class="mr-2" :trigger-type="runnable.triggerType"></TriggerIcon>
      <fs-date-format class="mr-1" :model-value="runnable.createTime"></fs-date-format>
      <a-tag class="ml-0 mr-1" :color="status.color" :closable="status.value === 'start'" @close="cancelTask">
        {{ status.label }}
      </a-tag>
      <a-tag v-if="isCurrent" class="pointer ml-0 mr-1" color="green" :closable="true" @close="cancel">当前</a-tag>
      <a-tag v-else-if="!editMode" class="pointer ml-0 mr-1" color="blue" @click="view">查看</a-tag>
    </p>
  </a-timeline-item>
</template>

<script lang="ts">
import { defineComponent, ref, provide, Ref, watch, computed } from "vue";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import * as api from "../../api";
import { Modal, notification } from "ant-design-vue";
import TriggerIcon from "./trigger-icon.vue";
export default defineComponent({
  name: "PiHistoryTimelineItem",
  components: {
    TriggerIcon,
  },
  props: {
    runnable: {
      type: Object,
      default() {
        return {};
      },
    },
    historyId: {
      type: Number,
    },
    type: {
      type: String,
      default: "icon",
    },
    isCurrent: {
      type: Boolean,
    },
    editMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["view", "cancel"],
  setup(props: any, ctx: any) {
    const status = computed(() => {
      return statusUtil.get(props.runnable?.status);
    });

    function view() {
      ctx.emit("view");
    }
    function cancel() {
      ctx.emit("cancel");
    }
    function cancelTask() {
      Modal.confirm({
        title: "确认取消",
        content: "确认取消该任务吗？",
        okText: "确认",
        cancelText: "取消",
        onOk: async () => {
          await api.Cancel(props.historyId);
          notification.success({
            message: "任务取消成功",
          });
        },
      });
    }

    return {
      status,
      cancel,
      view,
      cancelTask,
    };
  },
});
</script>
<style lang="less">
.pi-history-timeline-item {
  .ant-tag.pointer {
    cursor: pointer;
  }

  .ant-timeline .ant-timeline-item-content {
    margin-inline-start: 22px !important;
  }
}
</style>
