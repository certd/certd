<template>
  <a-dropdown class="fs-locale-picker">
    <div>
      <fs-iconify icon="ion-globe-outline" @click.prevent></fs-iconify>
    </div>

    <template #overlay>
      <a-menu @click="changeLocale">
        <a-menu-item v-for="item in languages" :key="item.key" :command="item.key">
          <div class="language-item">
            <span v-if="item.key === current" class="icon-radio">
              <span class="iconify" data-icon="ion:radio-button-on" data-inline="false"></span>
            </span>
            <span v-else class="icon-radio">
              <span class="iconify" data-icon="ion:radio-button-off" data-inline="false"></span>
            </span>
            {{ item.label }}
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script lang="ts">
import i18n from "../../../i18n";
import { computed, inject } from "vue";
import _ from "lodash-es";
export default {
  name: "FsLocale",
  setup() {
    const languages = computed(() => {
      const map: any = i18n.global.messages?.value || {};
      const list: any = [];
      _.forEach(map, (item, key) => {
        list.push({
          key,
          label: item.label
        });
      });
      return list;
    });
    const current = computed(() => {
      return i18n.global.locale.value;
    });

    const routerReload: any = inject("fn:router.reload");
    const localeChanged: any = inject("fn:locale.changed");
    const changeLocale = (change: any) => {
      i18n.global.locale.value = change.key;
      routerReload();
      localeChanged(change.key);
    };
    return {
      languages,
      current,
      changeLocale
    };
  }
};
</script>

<style lang="less">
.fs-locale-picker {
  display: flex;
  align-items: center;
}
.language-item {
  display: flex;
  align-items: center;
  .icon-radio {
    display: flex;
    align-items: center;
  }
  .iconify {
    margin-right: 5px;
  }
}
</style>
