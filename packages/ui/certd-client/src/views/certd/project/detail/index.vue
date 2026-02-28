<template>
  <fs-page class="page-project-detail">
    <template #header>
      <div class="title">
        {{ t("certd.ent.projectDetailManager") }}
        <span class="sub flex-inline items-center">
          项目名称 ：<a-tag color="green">{{ project?.name }}</a-tag>
          <a-divider type="vertical"></a-divider>
          管理员：<fs-values-format :model-value="project.adminId" :dict="userDict" color="green"></fs-values-format>
          <!-- <a-divider type="vertical"></a-divider>
          <fs-values-format :model-value="project.permission" :dict="projectPermissionDict"></fs-values-format>
          <a-divider type="vertical"></a-divider>
          <fs-values-format :model-value="project.status" :dict="projectMemberStatusDict"></fs-values-format> -->
        </span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #pagination-left>
        <a-tooltip :title="t('certd.batchDelete')">
          <fs-button icon="DeleteOutlined" @click="handleBatchDelete"></fs-button>
        </a-tooltip>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { onActivated, onMounted, Ref, ref } from "vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { message, Modal } from "ant-design-vue";
import { DeleteBatch } from "./api";
import { useI18n } from "/src/locales";
import { useRoute } from "vue-router";
import { useProjectStore } from "/@/store/project";
import { request } from "/@/api/service";
import { useDicts } from "../../dicts";
import { useCrudPermission } from "/@/plugin/permission";

const { t } = useI18n();

defineOptions({
  name: "ProjectDetail",
});

const route = useRoute();
const projectIdStr = route.query.projectId as string;
let projectId = Number(projectIdStr);
const projectStore = useProjectStore();
if (!projectId) {
  projectId = projectStore.currentProject?.id;
}

const { projectPermissionDict, projectMemberStatusDict, userDict } = useDicts();

const project: Ref<any> = ref({});

async function loadProjectDetail() {
  if (projectId) {
    const res = await request({
      url: `/enterprise/project/detail`,
      method: "post",
      params: {
        projectId,
      },
    });
    project.value = res;
  }
}

const context: any = {
  projectId,
  permission: {
    isProjectPermission: true,
    projectPermission: "admin",
  },
};
const { hasActionPermission } = useCrudPermission(context);
context.hasActionPermission = hasActionPermission;
const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context });

const selectedRowKeys = context.selectedRowKeys;
const handleBatchDelete = () => {
  if (selectedRowKeys.value?.length > 0) {
    Modal.confirm({
      title: t("certd.confirmTitle"),
      content: t("certd.confirmDeleteBatch", { count: selectedRowKeys.value.length }),
      async onOk() {
        await DeleteBatch(selectedRowKeys.value);
        message.info(t("certd.deleteSuccess"));
        crudExpose.doRefresh();
        selectedRowKeys.value = [];
      },
    });
  } else {
    message.error(t("certd.selectRecordsFirst"));
  }
};

// 页面打开后获取列表数据
onMounted(async () => {
  await loadProjectDetail();
  crudExpose.doRefresh();
});
onActivated(async () => {
  await crudExpose.doRefresh();
});
</script>
<style lang="less"></style>
