import { defineStore } from "pinia";
import * as api from "./api";
import { message } from "ant-design-vue";
import { computed, ref } from "vue";
import { useSettingStore } from "../settings";
import { LocalStorage } from "/@/utils/util.storage";
import { useUserStore } from "../user";

export type ProjectItem = {
  id: string;
  name: string;
  permission?: string;
};

export const useProjectStore = defineStore("app.project", () => {
  const myProjects = ref([]);
  const inited = ref(false);
  const userStore = useUserStore();
  const userId = userStore.getUserInfo?.id;
  const lastProjectId = LocalStorage.get("currentProjectId:" + userId);
  const currentProjectId = ref(lastProjectId); // 直接调用

  const projects = computed(() => {
    return myProjects.value;
  });
  const currentProject = computed(() => {
    if (currentProjectId.value) {
      const project = projects.value.find(item => item.id === currentProjectId.value);
      if (project) {
        return project;
      }
    }
    if (projects.value.length > 0) {
      return projects.value[0];
    }

    return null;
  });

  const settingStore = useSettingStore();
  const isEnterprise = computed(() => {
    return settingStore.isEnterprise;
  });

  function getSearchForm() {
    if (!currentProjectId.value || !isEnterprise.value) {
      return {};
    }
    return {
      projectId: currentProjectId.value,
    };
  }
  async function loadMyProjects(): Promise<ProjectItem[]> {
    if (!isEnterprise.value) {
      return [];
    }
    const projects = await api.MyProjectList();
    myProjects.value = projects;
    if (projects.length > 0 && !currentProjectId.value) {
      changeCurrentProject(projects[0].id, true);
    }
  }

  function changeCurrentProject(id: string, silent?: boolean) {
    currentProjectId.value = id;
    LocalStorage.set("currentProjectId", id);
    if (!silent) {
      message.success("切换项目成功");
    }
  }

  async function reload() {
    inited.value = false;
    await init();
  }

  async function init() {
    if (!inited.value) {
      await loadMyProjects();
      inited.value = true;
    }
    return myProjects.value;
  }

  const isRead = computed(() => {
    if (!isEnterprise.value) {
      return true;
    }
    return currentProject.value;
  });

  const isWrite = computed(() => {
    if (!isEnterprise.value) {
      return true;
    }
    return currentProject.value?.permission === "write" || currentProject.value?.permission === "admin";
  });

  const isAdmin = computed(() => {
    if (!isEnterprise.value) {
      return true;
    }
    return currentProject.value?.permission === "admin";
  });

  function hasPermission(value: string) {
    if (!isEnterprise.value) {
      return true;
    }
    if (value === "read") {
      return isRead.value;
    } else if (value === "write") {
      return isWrite.value;
    } else if (value === "admin") {
      return isAdmin.value;
    }
    return false;
  }

  function $reset() {
    myProjects.value = [];
    currentProjectId.value = "";
  }

  return {
    projects,
    myProjects,
    currentProject,
    currentProjectId,
    isEnterprise,
    isRead,
    isWrite,
    isAdmin,
    getSearchForm,
    loadMyProjects,
    changeCurrentProject,
    reload,
    init,
    $reset,
    hasPermission,
  };
});
