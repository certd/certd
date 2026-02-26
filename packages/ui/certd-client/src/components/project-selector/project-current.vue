<template>
  <a-tag color="green" class="flex-center flex pointer items-center button-text" title="当前项目">
    <!-- <fs-icon icon="ion:apps" class="mr-1"></fs-icon> -->
    <fs-icon :icon="currentIcon" class="mr-5"></fs-icon>
    当前项目：{{ projectStore.currentProject?.name || "..." }}
  </a-tag>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useProjectStore } from "/@/store/project";
import { useDicts } from "/@/views/certd/dicts";
defineOptions({
  name: "ProjectCurrent",
});

const projectStore = useProjectStore();
// onMounted(async () => {
//   await projectStore.reload();
// });

const { projectPermissionDict } = useDicts();

const currentIcon = computed(() => {
  return projectPermissionDict.dataMap[projectStore.currentProject?.permission || ""]?.icon || "";
});
</script>
<style lang="less"></style>
