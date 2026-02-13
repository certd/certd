<template>
  <a-dropdown class="project-selector">
    <template #overlay>
      <a-menu @click="handleMenuClick">
        <a-menu-item v-for="item in projectStore.myProjects" :key="item.id">
          {{ item.name }}
        </a-menu-item>
      </a-menu>
    </template>
    <div class="rounded pl-3 pr-3 px-2 py-1 flex-center flex pointer items-center bg-accent h-10 button-text" title="当前项目">
      <fs-icon icon="ion:apps" class="mr-1"></fs-icon>
      当前项目：{{ projectStore.currentProject?.name || "..." }}
      <fs-icon icon="ion:chevron-down-outline" class="ml-1"></fs-icon>
    </div>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useProjectStore } from "/@/store/project";
defineOptions({
  name: "ProjectSelector",
});

const projectStore = useProjectStore();
onMounted(async () => {
  await projectStore.reload();
});

function handleMenuClick({ key }: any) {
  projectStore.changeCurrentProject(key);
  window.location.reload();
}
</script>
<style lang="less">
.project-selector {
  &.button-text {
    min-width: 150px;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
