<template>
  <div class="ca-access">
    <a-alert v-if="caType === 'root'" type="info" show-icon class="mb-3" :message="t('certd.localCa.rootGrantHint')" />
    <a-tabs v-model:active-key="activeKey">
      <a-tab-pane key="admins" :tab="t('certd.localCa.admins')">
        <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.adminHint')" />
        <div class="ca-access-add">
          <a-select v-model:value="adminUserId" class="ca-access-user" show-search option-filter-prop="label" :placeholder="t('certd.localCa.selectUser')" :options="userOptions" />
          <a-button type="primary" :loading="saving" @click="addAdmin">{{ t("certd.localCa.addAccess") }}</a-button>
        </div>
        <a-table :data-source="admins" :columns="adminColumns" :loading="loading" size="small" row-key="id" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'adminUserId'">{{ userLabel(record.adminUserId) }}</template>
            <template v-else-if="column.key === 'role'">
              <a-tag :color="record.role === 'owner' ? 'gold' : 'blue'">{{ record.role === "owner" ? t("certd.localCa.roleOwner") : t("certd.localCa.roleOperator") }}</a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button v-if="record.role !== 'owner'" type="link" danger size="small" @click="removeAdmin(record)">{{ t("certd.localCa.removeAccess") }}</a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane v-if="caType === 'intermediate'" key="grants" :tab="t('certd.localCa.grants')">
        <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.grantHint')" />
        <div class="ca-access-add">
          <a-radio-group v-model:value="grantMode" button-style="solid">
            <a-radio-button value="user">{{ t("certd.localCa.grantModeUser") }}</a-radio-button>
            <a-radio-button value="project">{{ t("certd.localCa.grantModeProject") }}</a-radio-button>
          </a-radio-group>
          <a-select v-if="grantMode === 'user'" v-model:value="grantUserId" class="ca-access-user" show-search option-filter-prop="label" :placeholder="t('certd.localCa.selectUser')" :options="userOptions" />
          <a-select v-else v-model:value="projectId" class="ca-access-user" show-search option-filter-prop="label" :placeholder="t('certd.localCa.selectProject')" :options="projectOptions" />
          <a-button type="primary" :loading="saving" @click="addGrant">{{ t("certd.localCa.addAccess") }}</a-button>
        </div>
        <a-table :data-source="grants" :columns="grantColumns" :loading="loading" size="small" row-key="id" :pagination="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'mode'">
              <a-tag :color="record.userId > 0 ? 'blue' : 'green'">{{ record.userId > 0 ? t("certd.localCa.grantModeUser") : t("certd.localCa.grantModeProject") }}</a-tag>
            </template>
            <template v-else-if="column.key === 'target'">{{ record.userId > 0 ? userLabel(record.userId) : projectLabel(record.projectId) }}</template>
            <template v-else-if="column.key === 'actions'">
              <a-button type="link" danger size="small" @click="removeGrant(record)">{{ t("certd.localCa.removeAccess") }}</a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="tsx">
import { computed, onMounted, ref } from "vue";
import { Modal, notification } from "ant-design-vue";
import { request } from "/src/api/service";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";

defineOptions({
  name: "LocalCaAccess",
});

const props = defineProps<{
  caId: number;
  caType?: string;
  runStepUp: (title: string, desc: string, action: () => Promise<void>) => Promise<boolean>;
}>();

const { t } = useI18n();
const activeKey = ref("admins");
const loading = ref(false);
const saving = ref(false);
const grants = ref<any[]>([]);
const admins = ref<any[]>([]);
const adminUserId = ref<number | undefined>();
const grantMode = ref<"user" | "project">("user");
const grantUserId = ref<number | undefined>();
const projectId = ref<number | undefined>();
const userOptions = ref<{ label: string; value: number }[]>([]);
const projectOptions = ref<{ label: string; value: number }[]>([]);

const grantColumns = computed(() => [
  { title: t("certd.localCa.grantMode"), key: "mode", width: 100 },
  { title: t("certd.localCa.grantTarget"), key: "target" },
  { title: t("certd.localCa.accessActions"), key: "actions", width: 100 },
]);
const adminColumns = computed(() => [
  { title: t("certd.localCa.grantUser"), key: "adminUserId" },
  { title: t("certd.localCa.adminRole"), key: "role", width: 120 },
  { title: t("certd.localCa.accessActions"), key: "actions", width: 100 },
]);

function userLabel(id: number) {
  return userOptions.value.find(item => item.value === Number(id))?.label || `#${id}`;
}
function projectLabel(id: number) {
  return projectOptions.value.find(item => item.value === Number(id))?.label || `#${id}`;
}

async function load() {
  loading.value = true;
  try {
    const [adminList, grantList] = await Promise.all([localCaApi.ListAdmins(props.caId), props.caType === "intermediate" ? localCaApi.ListGrants(props.caId) : Promise.resolve([])]);
    admins.value = adminList || [];
    grants.value = grantList || [];
  } catch (e: any) {
    notification.error({ message: String(e?.message || e) });
  } finally {
    loading.value = false;
  }
}

async function loadUsers() {
  try {
    const users: any[] = await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST" });
    userOptions.value = (users || []).map(user => ({
      label: user.nickName || user.username || (user.phoneCode ? `${user.phoneCode}${user.mobile || ""}` : user.mobile) || String(user.id),
      value: Number(user.id),
    }));
  } catch (e) {
    userOptions.value = [];
  }
}

async function loadProjects() {
  try {
    const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } } });
    projectOptions.value = (res?.records || []).map((item: any) => ({ label: item.name, value: Number(item.id) }));
  } catch (e) {
    projectOptions.value = [];
  }
}

async function addAdmin() {
  if (!adminUserId.value) {
    notification.warning({ message: t("certd.localCa.selectUser") });
    return;
  }
  saving.value = true;
  try {
    await props.runStepUp(t("certd.localCa.adminStepUpTitle"), t("certd.localCa.adminStepUpDesc"), async () => {
      await localCaApi.AddAdmin({ id: props.caId, adminUserId: adminUserId.value, role: "operator" });
      notification.success({ message: t("certd.localCa.accessSaved") });
      await load();
    });
    adminUserId.value = undefined;
  } finally {
    saving.value = false;
  }
}

async function addGrant() {
  if (grantMode.value === "user" && !grantUserId.value) {
    notification.warning({ message: t("certd.localCa.selectUser") });
    return;
  }
  if (grantMode.value === "project" && !projectId.value) {
    notification.warning({ message: t("certd.localCa.selectProject") });
    return;
  }
  saving.value = true;
  try {
    await props.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), async () => {
      const payload = grantMode.value === "user" ? { id: props.caId, grantUserId: grantUserId.value } : { id: props.caId, grantProjectId: projectId.value };
      await localCaApi.AddGrant(payload);
      notification.success({ message: t("certd.localCa.accessSaved") });
      await load();
    });
    grantUserId.value = undefined;
    projectId.value = undefined;
  } finally {
    saving.value = false;
  }
}

function removeGrant(record: any) {
  Modal.confirm({
    title: t("certd.localCa.grantRemoveTitle"),
    content: t("certd.localCa.grantRemoveContent", { user: record.userId > 0 ? userLabel(record.userId) : projectLabel(record.projectId) }),
    async onOk() {
      await props.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), async () => {
        await localCaApi.RemoveGrant(props.caId, record.id);
        notification.success({ message: t("certd.localCa.accessRemoved") });
        await load();
      });
    },
  });
}

function removeAdmin(record: any) {
  Modal.confirm({
    title: t("certd.localCa.adminRemoveTitle"),
    content: t("certd.localCa.adminRemoveContent", { user: userLabel(record.adminUserId) }),
    async onOk() {
      await props.runStepUp(t("certd.localCa.adminStepUpTitle"), t("certd.localCa.adminStepUpDesc"), async () => {
        await localCaApi.RemoveAdmin(props.caId, record.adminUserId);
        notification.success({ message: t("certd.localCa.accessRemoved") });
        await load();
      });
    },
  });
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadProjects(), load()]);
});
</script>

<style lang="less">
.ca-access {
  .ca-access-add {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .ca-access-user {
    flex: 1;
    min-width: 180px;
  }
  .ca-access-project {
    width: 200px;
  }
}
</style>
