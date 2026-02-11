import { defineStore } from "pinia";
import * as api from "./api";
import { message } from "ant-design-vue";
import { computed, ref } from "vue";
import { useSettingStore } from "../settings";
import { LocalStorage } from "/@/utils/util.storage";

export type ProjectItem = {
  id: string;
  name: string;
  permission?: string;
};

export const useProjectStore = defineStore("app.project", () => {
  const myProjects = ref([]);
  const lastProjectId = LocalStorage.get("currentProjectId");
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
    const projects = await api.MyProjectList();
    myProjects.value = projects;
  }

  async function init() {
    if (!myProjects.value) {
      await reload();
    }
    return myProjects.value;
  }

  return {
    projects,
    myProjects,
    currentProject,
    currentProjectId,
    isEnterprise,
    getSearchForm,
    loadMyProjects,
    changeCurrentProject,
    reload,
    init,
  };
});
