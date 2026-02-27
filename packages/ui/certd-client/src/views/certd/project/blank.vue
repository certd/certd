<template>
  <fs-page class="page-cert">
    <template #header>
      <div class="title">
        {{ t("certd.sysResources.myProjectManager") }}
      </div>
    </template>
    <div class="blank-container">
      <div class="project-list-container">
        <h3 class="text-lg font-medium mb-4">{{ t("certd.project.systemProjects") }}</h3>
        <a-card v-for="project in projects" :key="project.id" :bordered="false" class="project-card">
          <div class="project-card-content">
            <div class="project-info">
              <h4 class="text-md font-medium">{{ project.name }}</h4>
              <p class="text-gray-500 text-sm">{{ t("certd.project.createdAt") }}: {{ formatDate(project.createTime) }}</p>
            </div>
            <a-button type="primary" @click="applyToJoin(project.id)">{{ t("certd.project.applyJoin") }}</a-button>
          </div>
        </a-card>
        <div v-if="projects.length === 0" class="no-projects"></div>
      </div>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useI18n } from "/src/locales";
import { message } from "ant-design-vue";
import { request } from "/src/api/service";

const { t } = useI18n();

const projects = ref<any[]>([]);

const getSystemProjects = async () => {
  try {
    // 假设这里调用获取系统项目列表的API
    const response = await request({
      url: "/enterprise/project/list",
      method: "post",
      data: { type: "system" }, // 假设type=system表示系统项目
    });
    projects.value = response || [];
  } catch (error) {
    message.error(t("certd.project.fetchFailed"));
    console.error("获取项目列表失败:", error);
  }
};

const applyToJoin = async (projectId: number) => {
  try {
    // 假设这里调用申请加入项目的API
    await request({
      url: "/enterprise/project/apply",
      method: "post",
      data: { projectId },
    });
    message.success(t("certd.project.applySuccess"));
    // 申请成功后可以刷新页面或跳转到项目列表
  } catch (error) {
    message.error(t("certd.project.applyFailed"));
    console.error("申请加入项目失败:", error);
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString();
};

onMounted(() => {
  getSystemProjects();
});
</script>

<style lang="less">
.blank-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.empty-state {
  margin-bottom: 48px;
  text-align: center;
}

.empty-description {
  margin-top: 16px;
}

.project-list-container {
  margin-top: 32px;
}

.project-card {
  margin-bottom: 16px;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.project-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-info {
  flex: 1;
}

.no-projects {
  margin-top: 24px;
  padding: 48px 0;
  text-align: center;
}
</style>
