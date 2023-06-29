<template>
  <span v-if="statusRef" class="pi-status-show">
    <template v-if="type === 'icon'">
      <fs-icon class="status-icon" v-bind="statusRef" :style="{ color: statusRef.color }" />
    </template>
    <template v-if="type === 'tag'">
      <a-tag :color="statusRef.color">{{ statusRef.label }}</a-tag>
    </template>
  </span>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { statusUtil } from "/@/views/certd/pipeline/pipeline/utils/util.status";

export default defineComponent({
  name: "PiStatusShow",
  props: {
    status: {
      type: [String, Number],
      default: ""
    },
    type: {
      type: String,
      default: "icon"
    }
  },
  setup(props, ctx) {
    const statusRef = computed(() => {
      return statusUtil.get(props.status as string);
    });

    return {
      statusRef
    };
  }
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
