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
      <a-tag v-if="isCurrent" class="pointer ml-0 mr-1" color="green" :closable="true" @close="cancel">{{ t("certd.pipeline.editor.current") }}</a-tag>
      <a-tag v-else-if="!editMode" class="pointer ml-0 mr-1" color="blue" @click="view">{{ t("certd.pipeline.editor.view") }}</a-tag>
    </p>
  </a-timeline-item>
</template>

<script lang="ts">
import { defineComponent, ref, provide, Ref, watch, computed } from "vue";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";
import * as api from "../../api";
import { Modal, notification } from "ant-design-vue";
import TriggerIcon from "./trigger-icon.vue";
import { useI18n } from "/@/locales";
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
    const { t } = useI18n();
    const status = computed(() => {
      const statusItem = statusUtil.get(props.runnable?.status);
      return {
        ...statusItem,
        label: t(`certd.pipeline.editor.${statusItem.label}`),
      };
    });

    function view() {
      ctx.emit("view");
    }
    function cancel() {
      ctx.emit("cancel");
    }
    function cancelTask() {
      Modal.confirm({
        title: t("certd.pipeline.editor.confirmCancel"),
        content: t("certd.pipeline.editor.confirmCancelTask"),
        okText: t("certd.pipeline.editor.confirm"),
        cancelText: t("certd.pipeline.editor.cancel"),
        onOk: async () => {
          await api.Cancel(props.historyId);
          notification.success({
            message: t("certd.pipeline.editor.taskCanceled"),
          });
        },
      });
    }

    return {
      status,
      cancel,
      view,
      cancelTask,
      t,
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
