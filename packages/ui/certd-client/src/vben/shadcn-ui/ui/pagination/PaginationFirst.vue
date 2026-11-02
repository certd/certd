<script setup lang="ts">
import type { PaginationFirstProps } from "radix-vue";

import { computed } from "vue";

import { cn } from "/@/vben/shared/utils";

import { ChevronsLeft } from "@lucide/vue";
import { PaginationFirst } from "radix-vue";

import { Button } from "../button";

const props = withDefaults(defineProps<PaginationFirstProps & { class?: any }>(), {
  asChild: true,
});

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <PaginationFirst v-bind="delegatedProps">
    <Button :class="cn('size-8 p-0', props.class)" variant="outline">
      <slot>
        <ChevronsLeft class="size-4" />
      </slot>
    </Button>
  </PaginationFirst>
</template>
