<template>
  <fs-page class="page-project-join">
    <template #header>
      <div class="title">
        {{ t("certd.sysResources.projectJoin") }}
        <span v-if="projectStore.projects.length === 0" class="sub">{{ t("certd.project.noProjectJoined") }}</span>
      </div>
    </template>
    <div class="project-container">
      <h3 class="text-lg font-medium mb-4">{{ t("certd.project.projectList") }}</h3>
      <div class="flex flex-wrap gap-4">
        <div v-for="project in projects" :key="project.id" class="w-full md:w-1/4">
          <a-card :bordered="true" class="project-card">
            <div class="project-card-content">
              <div class="project-info">
                <h3 class="text-md font-bold title">{{ project.name }}</h3>
                <p class="text-gray-500 text-sm">{{ formatDate(project.createTime) }}</p>
              </div>
              <div class="flex justify-between items-center">
                <div v-if="project.status">
                  <fs-values-format :model-value="project.status" :dict="projectMemberStatusDict"></fs-values-format>
                </div>
                <div v-if="project.permission"><fs-values-format :model-value="project.permission" :dict="projectPermissionDict"></fs-values-format></div>
              </div>
            </div>
            <template #actions>
              <span v-if="!project.status || project.status === 'rejected'" class="flex-inline items-center" :title="t('certd.project.applyJoin')" @click="applyToJoin(project.id)">
                <fs-icon class="fs-18 mr-2" icon="mdi:checkbox-marked-circle-outline"></fs-icon>
                {{ t("certd.project.applyJoin") }}
              </span>
              <span v-if="project.status === 'pending' || project.status === 'approved'" class="flex-inline items-center" :title="t('certd.project.leave')" @click="leaveProject(project.id)">
                <fs-icon class="fs-18 mr-2" icon="mdi:arrow-right-thin-circle-outline"></fs-icon>
                {{ t("certd.project.leave") }}
              </span>
            </template>
          </a-card>
        </div>
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useI18n } from "/src/locales";
import { message, Modal } from "ant-design-vue";
import { request } from "/src/api/service";
import { useProjectStore } from "/@/store/project";
import dayjs from "dayjs";
import { useDicts } from "../dicts";
import { modalProps } from "ant-design-vue/es/modal/Modal";

defineOptions({
  name: "ProjectJoin",
});
const { t } = useI18n();

const { projectMemberStatusDict, projectPermissionDict } = useDicts();

const projects = ref<any[]>([]);

const projectStore = useProjectStore();

const getSystemProjects = async () => {
  try {
    // 假设这里调用获取系统项目列表的API
    const response = await request({
      url: "/enterprise/project/all",
      method: "post",
    });
    projects.value = response || [];
  } catch (error) {
    message.error(t("certd.project.fetchFailed"));
    console.error("获取项目列表失败:", error);
  }
};

const applyToJoin = async (projectId: number) => {
  // 假设这里调用申请加入项目的API
  Modal.confirm({
    title: t("certd.project.applyJoin"),
    content: t("certd.project.applyJoinConfirm"),
    onOk: async () => {
      await request({
        url: "/enterprise/project/applyJoin",
        method: "post",
        data: { projectId },
      });
      message.success(t("certd.project.applySuccess"));
      await getSystemProjects();
      // 申请成功后可以刷新页面或跳转到项目列表
    },
  });
};

const formatDate = (dateString: string) => {
  if (!dateString) {
    return "";
  }
  return dayjs(dateString).format("YYYY-MM-DD HH:mm:ss");
};

onMounted(() => {
  getSystemProjects();
});

async function leaveProject(projectId: number) {
  // 假设这里调用退出项目的API
  Modal.confirm({
    title: t("certd.project.leave"),
    content: t("certd.project.leaveConfirm"),
    onOk: async () => {
      await request({
        url: "/enterprise/project/leave",
        method: "post",
        data: { projectId },
      });
      message.success(t("certd.project.leaveSuccess"));
      // 退出成功后可以刷新页面或跳转到项目列表
      await getSystemProjects();
    },
  });
}
</script>

<style lang="less">
.page-project-join {
  .project-container {
    padding: 24px;
    margin: 0 auto;
    .project-card {
      margin-bottom: 16px;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .project-card-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .title {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 8px;
      }
    }
  }
}
</style>
