<template>
  <div class="fs-theme-mode">
    <a-switch :checked="setting.themeConfig.mode === 'dark'" @update:checked="onChange">
      <template #checkedChildren>
        <fs-iconify icon="ion:moon" />
      </template>
      <template #unCheckedChildren>
        <fs-iconify icon="ion:sunny" />
      </template>
    </a-switch>
  </div>
</template>

<script lang="ts">
import { ref, defineComponent } from "vue";
import { useSettingStore } from "/@/store/modules/settings";

export default defineComponent({
  name: "FsThemeModeSet",
  components: {},
  setup() {
    const setting = useSettingStore();
    const onChange = (checked: boolean) => {
      if (checked) {
        setting.setDarkMode("dark");
      } else {
        setting.setDarkMode("light");
      }
    };
    return {
      setting,
      onChange
    };
  }
});
</script>

<style lang="less">
.fs-theme-mode {
  display: inline-flex;
  justify-content: center;
  align-items: center;
}
</style>
