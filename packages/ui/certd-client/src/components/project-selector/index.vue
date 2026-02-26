<template>
  <a-dropdown class="project-selector">
    <template #overlay>
      <a-menu @click="handleMenuClick">
        <a-menu-item v-for="item in projectStore.myProjects" :key="item.id">
          <div class="flex items-center justify-between w-full">
            <span class="mr-1">{{ item.name }}</span>
            <fs-values-format :model-value="item.permission" :dict="projectPermissionDict"></fs-values-format>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
    <div class="rounded pl-3 pr-3 px-2 py-1 flex-center flex pointer items-center bg-accent h-10 button-text" title="当前项目">
      <!-- <fs-icon icon="ion:apps" class="mr-1"></fs-icon> -->
      <fs-icon :icon="currentIcon" class="mr-5"></fs-icon>
      当前项目：{{ projectStore.currentProject?.name || "..." }}
    </div>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useProjectStore } from "/@/store/project";
import { useDicts } from "/@/views/certd/dicts";
defineOptions({
  name: "ProjectSelector",
});

const projectStore = useProjectStore();
onMounted(async () => {
  await projectStore.reload();
  console.log(projectStore.myProjects);
});

function handleMenuClick({ key }: any) {
  projectStore.changeCurrentProject(key);
  window.location.reload();
}
const { projectPermissionDict } = useDicts();

const currentIcon = computed(() => {
  return projectPermissionDict.dataMap[projectStore.currentProject?.permission || ""]?.icon || "";
});
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
