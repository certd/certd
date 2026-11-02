<script lang="ts" setup>
import { cn } from "/@/vben/shared/utils";

import { ChevronRight } from "@lucide/vue";

const props = defineProps<{
  class?: any;
}>();
</script>

<template>
  <li :class="cn('[&>svg]:size-3.5', props.class)" aria-hidden="true" role="presentation">
    <slot>
      <ChevronRight />
    </slot>
  </li>
</template>
