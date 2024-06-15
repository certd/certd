<template>
  <component :is="ui.tag.name" type="red">value : {{ modelValue || value }}</component>
</template>

<script setup lang="ts">
import { useUi } from "@fast-crud/ui-interface";

type ScProps = {
  modelValue?: string;
  value?: string;
};
const props = defineProps<ScProps>();
const { ui } = useUi();
</script>
