<template>
  <div class="fs-bpmn-demo-page">
    <div class="header">
      <component :is="ui.tabs.name" v-model:active-key="activeKey" type="card">
        <component :is="ui.tabPane.name" key="designer" tab="设计器"> </component>
      </component>
      <div>
        <span class="m-l"> showMiniMapButton<a-switch v-model:checked="toolbarProps.buttons.miniMap" /> </span>
        <span class="m-l"></span>
        <span class="m-l"> showExtensionProperties <a-switch v-model:checked="binding.showExtensionProperties" /> </span>
        <span class="m-l"> showNameAndCode<a-switch v-model:checked="binding.showNameAndCode" /> </span>
        <span class="m-l"></span>
        <span class="m-l"> showToolbar<a-switch v-model:checked="binding.showToolbar" /> </span>
        <span class="m-l"> showMiniMap<a-switch v-model:checked="binding.showMinimap" /> </span>
        <span class="m-l"> showPanel<a-switch v-model:checked="binding.showPanel" /> </span>
        <span class="m-l"> showSettings<a-switch v-model:checked="binding.showSettings" /> </span>
        <span class="m-l"> showPalette<a-switch v-model:checked="binding.showPalette" /> </span>
        <span class="m-l"> showContextMenu<a-switch v-model:checked="binding.showContextMenu" /> </span>
        <fs-bpmn-preview-demo></fs-bpmn-preview-demo>
      </div>
    </div>
    <div class="main">
      <fs-bpmn v-model:xml="xmlRef" :panel="panelProps" :toolbar="toolbarProps" v-bind="binding" @save="onSave">
        <template #toolbar_left>
          <a-tag>toolbar_left插槽</a-tag>
        </template>
        <template #toolbar_right>
          <a-tag>toolbar_right插槽</a-tag>
        </template>
      </fs-bpmn>
    </div>
  </div>
</template>
<script lang="ts">
import zhCN from "ant-design-vue/es/locale/zh_CN";

import { defineComponent, Ref, ref } from "vue";
import FsBpmnPreviewDemo from "./preview.vue";
import { demoXml } from "./xml";
import { useUi } from "@fast-crud/ui-interface";
import { FsBpmnPanelProps, Base, FsBpmnToolbarProps } from "@fast-crud/fast-bpmn";
import ElementUserAssign from "./ElementUserAssign.vue";

const FsBpmnDemo = defineComponent({
  components: { FsBpmnPreviewDemo },
  setup() {
    const localRef = ref(zhCN);
    const xmlRef = ref(demoXml);
    const { ui } = useUi();
    const activeKey = ref("designer");
    const binding: Ref = ref({
      showToolbar: true,
      showMinimap: true,
      showPanel: true,
      showSettings: false,
      showPalette: true,
      showContextMenu: true,
      showNameAndCode: true,
      showExtensionProperties: true
    });
    const toolbarProps = ref<FsBpmnToolbarProps>({
      buttons: {
        miniMap: true
      }
    });
    const panelProps = ref<FsBpmnPanelProps>({
      //注册自定义组件
      registerComponents() {
        //也可以写在 bpmn-setup进行全局注册
        return {
          ElementUserAssign: {
            order: 3,
            component: ElementUserAssign,
            props: {},
            show(element: any) {
              //什么情况下显示此组件， element为当前选中的元素节点
              return element.type === "bpmn:UserTask";
            }
          }
        };
      },
      //重新设置组件配置
      resetComponents(elements, components) {
        //ElementGenerations
        //ElementDocumentations
        //ElementJobExecution
        //ElementExtensionProperties
        //ElementExecutionListeners
        //ElementAsyncContinuations
        //ElementStartInitiator
        //ElementUserAssign
        components.ElementGenerations.props.showNameAndCode = binding.value.showNameAndCode;

        components.ElementDocumentations.show = true;

        if (binding.value.showExtensionProperties === false) {
          components.ElementExtensionProperties.show = false;
        }
      }
    });

    function onSave(xml: string) {
      console.log("onsave", xml);
    }
    return {
      localRef,
      xmlRef,
      ui,
      activeKey,
      panelProps,
      binding,
      onSave,
      toolbarProps
    };
  }
});

export default FsBpmnDemo;
</script>
<style lang="less">
.fs-bpmn-demo-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  .header {
    padding: 20px 20px 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .ant-tabs-nav {
      padding: 0px !important;
    }
  }
  .main {
    flex: 1;
    overflow: hidden;
  }
  .ant-tabs-content {
    height: 100%;
    .ant-tabs-tabpane {
      height: 100%;
    }
  }
}
</style>
