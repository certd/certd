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
        <a-menu-item key="join">
          <div class="flex items-center w-full">
            <fs-icon icon="ion:add" class="mr-1"></fs-icon>
            <span>加入其他项目</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
    <div class="rounded pl-3 pr-3 px-2 py-1 flex-center flex pointer items-center bg-accent h-10 button-text" title="当前项目">
      <!-- <fs-icon icon="ion:apps" class="mr-1"></fs-icon> -->
      <span class="hidden md:flex"> 当前项目：</span>
      <span class="text-ellipsis">{{ projectStore.currentProject?.name || "..." }}</span>
      <fs-icon :icon="currentIcon" class="ml-5"></fs-icon>
    </div>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useProjectStore } from "/@/store/project";
import { useDicts } from "/@/views/certd/dicts";
import { useRouter } from "vue-router";
defineOptions({
  name: "ProjectSelector",
});

const projectStore = useProjectStore();
onMounted(async () => {
  await projectStore.init();
  console.log(projectStore.myProjects);
});

const router = useRouter();
function handleMenuClick({ key }: any) {
  if (key === "join") {
    router.push("/certd/project/join");
    return;
  }

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
    min-width: 100px;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
