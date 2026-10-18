<template>
  <span v-if="statusRef" class="pi-status-show flex-o">
    <template v-if="type === 'icon'">
      <fs-icon class="status-icon" v-bind="statusRef" :style="{ color: statusRef.iconColor || statusRef.color }" />
    </template>
    <template v-if="type === 'tag'">
      <a-tag :color="statusRef.color">{{ statusRef.label }}</a-tag>
    </template>
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { useI18n } from "/@/locales";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";

export default defineComponent({
  name: "PiStatusShow",
  props: {
    status: {
      type: [String, Number],
      default: "",
    },
    type: {
      type: String,
      default: "icon",
    },
  },
  setup(props, ctx) {
    const { t } = useI18n();
    const statusRef = computed(() => {
      const status = statusUtil.get(props.status as string);
      if (!status) {
        return null;
      }
      return { ...status, label: t(`certd.pipeline.editor.status${String(status.value).replace(/(^|_)(\w)/g, (_, _separator, letter) => letter.toUpperCase())}`) };
    });

    return {
      statusRef,
    };
  },
});
</script>
<style lang="less">
.pi-status-show {
  .status-icon {
    font-size: 16px;
    margin-left: 3px;
    margin-right: 3px;
  }
}
</style>
