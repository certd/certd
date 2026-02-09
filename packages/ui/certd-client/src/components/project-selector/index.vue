<template>
  <a-dropdown class="project-selector">
    <template #overlay>
      <a-menu @click="handleMenuClick">
        <a-menu-item v-for="item in projectStore.myProjects" :key="item.id">
          {{ item.name }}
        </a-menu-item>
      </a-menu>
    </template>
    <div class="rounded pl-2 pr-2 px-2 py-1 flex-center flex pointer bg-accent h-10 button-text">
      {{ projectStore.currentProject?.name || "..." }}
      <DownOutlined class="ml-1" />
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
}
</script>
<style lang="less">
.project-selector {
  &.button-text {
    min-width: 100px;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
