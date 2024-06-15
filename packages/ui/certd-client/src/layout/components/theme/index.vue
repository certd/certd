<template>
  <div class="fs-theme" @click="show()">
    <fs-iconify icon="ion:sparkles-outline" />
    <a-drawer v-model:open="visible" title="主题设置" placement="right" width="350px" :closable="false" @after-open-change="afterVisibleChange">
      <fs-theme-color-picker :primary-color="setting.themeConfig?.colorPrimary" @change="setting.setPrimaryColor"></fs-theme-color-picker>
    </a-drawer>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from "vue";
import FsThemeColorPicker from "./color-picker.vue";
import { useSettingStore } from "/@/store/modules/settings";

export default defineComponent({
  name: "FsTheme",
  components: { FsThemeColorPicker },
  setup() {
    const visible = ref(false);
    function afterVisibleChange() {}
    function show() {
      visible.value = true;
    }

    const setting = useSettingStore();
    return {
      visible,
      show,
      afterVisibleChange,
      setting
    };
  }
});
</script>

<style lang="less">
.fs-theme {
}
.fs-theme-drawer {
}
</style>
