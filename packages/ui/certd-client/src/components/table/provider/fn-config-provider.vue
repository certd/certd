<template>
  <div class="fn-config-provider">
    <FnModalProvider>
      <FnNotificationHost />
      <slot />
    </FnModalProvider>
  </div>
</template>

<script setup lang="ts">
import FnModalProvider from "../modal/fn-modal-provider.vue";
import FnNotificationHost from "../notification/fn-notification-host.vue";
import { provideFnUiServices } from "./context";

provideFnUiServices();
</script>

<style lang="less">
.fn-config-provider {
  display: contents;
}
</style>
