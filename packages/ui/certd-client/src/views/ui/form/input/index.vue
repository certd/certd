<template>
  <fs-page>
    <template #header>
      <div class="title">input输入框</div>
    </template>
    <component :is="ui.card.name">
      <fs-ui-render :render-fn="inputDemo1Render"></fs-ui-render>
    </component>
  </fs-page>
</template>

<script lang="ts" setup>
import { useUi } from "@fast-crud/fast-crud";
import { ref } from "vue";

const { ui } = useUi();
const textRef = ref();
function inputDemo1Render() {
  return ui.input.render({ vModel: { ref: textRef, key: "value" } });
}
</script>
