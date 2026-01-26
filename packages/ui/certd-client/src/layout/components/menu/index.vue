<template>
  <a-menu v-model:open-keys="openKeys" v-model:selected-keys="selectedKeys" class="fs-menu" mode="inline" theme="light" :items="items" @click="onClick" />
</template>

<script lang="tsx" setup>
import { ref, watch } from "vue";
import { routerUtils } from "/@/utils/util.router";
import { useRoute } from "vue-router";
import { utils } from "@fast-crud/fast-crud";
import * as _ from "lodash-es";

defineOptions({
  name: "FsMenu",
});

const props = defineProps<{
  menus: any[];
  expandSelected: boolean;
}>();

const items = ref([]);

function buildItemMenus(menus: any) {
  if (menus == null) {
    return;
  }
  const list: any = [];
  for (const sub of menus) {
    if (sub.meta?.show != null) {
      if (sub.meta.show === false || (typeof sub.meta.show === "function" && !sub.meta.show())) {
        continue;
      }
    }
    const item: any = {
      key: sub.path,
      label: sub.title,
      title: sub.title,
      icon: () => {
        return <fsIcon icon={sub.icon ?? sub.meta?.icon} />;
      },
    };

    list.push(item);
    if (sub.children && sub.children.length > 0) {
      item.children = buildItemMenus(sub.children);
    }
  }
  return list;
}

watch(
  () => props.menus,
  menus => {
    items.value = buildItemMenus(menus);
  },
  { immediate: true }
);

async function onClick(item: any) {
  await routerUtils.open(item.key);
}
const route = useRoute();
const selectedKeys = ref([]);
const openKeys = ref([]);

function openSelectedParents(fullPath: any) {
  if (!props.expandSelected) {
    return;
  }
  if (props.menus == null) {
    return;
  }
  const keys: any = [];
  let changed = false;
  utils.deepdash.forEachDeep(props.menus, (value: any, key: any, parent: any, context: any) => {
    if (value == null) {
      return;
    }
    if (value.path === fullPath) {
      _.forEach(context.parents, item => {
        if (item.value instanceof Array) {
          return;
        }
        keys.push(item.value.path);
      });
    }
  });
  if (keys.length > 0) {
    for (const key of keys) {
      if (openKeys.value.indexOf(key) === -1) {
        openKeys.value.push(key);
        changed = true;
      }
    }
  }
  return changed;
}
watch(
  () => {
    return route.fullPath;
  },
  path => {
    // path = route.fullPath;
    selectedKeys.value = [path];
    const changed = openSelectedParents(path);
    if (changed) {
      // onOpenChange();
    }
  },
  {
    immediate: true,
  }
);
</script>
<style lang="less">
.fs-menu {
  height: 100%;
  overflow-y: auto;
  .fs-icon {
    font-size: 16px !important;
    min-width: 16px !important;
  }
}
</style>
