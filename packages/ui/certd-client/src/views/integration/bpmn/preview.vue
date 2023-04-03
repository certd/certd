<template>
  <component :is="ui.button.name" @click="openPreview">预览</component>

  <component :is="ui.dialog.name" v-if="dialogShow" v-model:[ui.dialog.visible]="dialogShow" title="预览" :width="1200">
    <fs-bpmn-preview v-if="processXmlRef" :xml="processXmlRef" :highlight="highlightRef" style="height: 600px"></fs-bpmn-preview>
  </component>
</template>

<script lang="tsx">
import { defineComponent, Ref, ref } from "vue";
import { useUi } from "@fast-crud/ui-interface";
import { demoXml } from "./xml";

export default defineComponent({
  name: "FsBpmnPreviewDemo",
  setup() {
    const { ui } = useUi();
    const processXmlRef: Ref = ref();
    const highlightRef: Ref<any[]> = ref([]);
    const dialogShow = ref(false);
    function openPreview() {
      processXmlRef.value = demoXml;
      //type 暂时无所谓
      highlightRef.value = [{ id: "Activity_1evmidl", type: "node", flicker: true }, { id: "Gateway_01mlwlp", type: "node" }, { id: "Event_0u7us6f", type: "node" }, { id: "Flow_0z7lqtc" }, { id: "Flow_1xxl1vf" }];
      dialogShow.value = true;
    }
    return {
      ui,
      processXmlRef,
      highlightRef,
      openPreview,
      dialogShow
    };
  }
});
</script>

<style scoped></style>
