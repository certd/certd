<template>
  <div class="ca-access">
    <a-alert v-if="mode === 'grants'" type="info" show-icon class="mb-3" :message="t('certd.localCa.grantHint')" />
    <a-alert v-else type="info" show-icon class="mb-3" :message="t('certd.localCa.adminHint')" />

    <div class="ca-access-add">
      <a-select v-if="mode === 'grants'" v-model:value="userIds" class="ca-access-user" show-search option-filter-prop="label" :placeholder="t('certd.localCa.selectUser')" :options="userOptions" />
      <a-select v-if="mode === 'grants'" v-model:value="projectId" class="ca-access-project" :placeholder="t('certd.localCa.allProjects')">
        <a-select-option :value="null">{{ t("certd.localCa.allProjects") }}</a-select-option>
        <a-select-option v-for="item in projectOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-if="mode === 'admins'" v-model:value="singleUserId" class="ca-access-user" show-search option-filter-prop="label" :placeholder="t('certd.localCa.selectUser')" :options="userOptions" />
      <a-button type="primary" :loading="saving" @click="add">{{ t("certd.localCa.addAccess") }}</a-button>
    </div>

    <a-table v-if="mode === 'grants'" :data-source="grants" :columns="grantColumns" :loading="loading" size="small" row-key="id" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'userId'">{{ userLabel(record.userId) }}</template>
        <template v-else-if="column.key === 'projectId'">{{ record.projectId ? projectLabel(record.projectId) : t("certd.localCa.allProjects") }}</template>
        <template v-else-if="column.key === 'actions'">
          <a-button type="link" danger size="small" @click="removeGrant(record)">{{ t("certd.localCa.removeAccess") }}</a-button>
        </template>
      </template>
    </a-table>

    <a-table v-else :data-source="admins" :columns="adminColumns" :loading="loading" size="small" row-key="id" :pagination="false">
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
  mode: "grants" | "admins";
  runStepUp: (title: string, desc: string, action: () => Promise<void>) => Promise<boolean>;
}>();

const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const grants = ref<any[]>([]);
const admins = ref<any[]>([]);
const userIds = ref<number | undefined>();
const singleUserId = ref<number | undefined>();
const projectId = ref<number | null>(null);
const userOptions = ref<{ label: string; value: number }[]>([]);
const projectOptions = ref<{ label: string; value: number }[]>([]);

const grantColumns = computed(() => [
  { title: t("certd.localCa.grantUser"), key: "userId" },
  { title: t("certd.localCa.grantProject"), key: "projectId" },
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
    if (props.mode === "grants") {
      grants.value = await localCaApi.ListGrants(props.caId);
    } else {
      admins.value = await localCaApi.ListAdmins(props.caId);
    }
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

async function add() {
  const userId = props.mode === "grants" ? userIds.value : singleUserId.value;
  if (!userId) {
    notification.warning({ message: t("certd.localCa.selectUser") });
    return;
  }
  saving.value = true;
  try {
    const action = async () => {
      if (props.mode === "grants") {
        await localCaApi.AddGrant({ id: props.caId, grantUserId: userId, grantProjectId: projectId.value ?? undefined });
      } else {
        await localCaApi.AddAdmin({ id: props.caId, adminUserId: userId, role: "operator" });
      }
      notification.success({ message: t("certd.localCa.accessSaved") });
      await load();
    };
    if (props.mode === "grants") {
      await props.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), action);
    } else {
      await props.runStepUp(t("certd.localCa.adminStepUpTitle"), t("certd.localCa.adminStepUpDesc"), action);
    }
    userIds.value = undefined;
    singleUserId.value = undefined;
    projectId.value = null;
  } finally {
    saving.value = false;
  }
}

function removeGrant(record: any) {
  Modal.confirm({
    title: t("certd.localCa.grantRemoveTitle"),
    content: t("certd.localCa.grantRemoveContent", { user: userLabel(record.userId) }),
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
  await Promise.all([loadUsers(), props.mode === "grants" ? loadProjects() : Promise.resolve(), load()]);
});
</script>

<style lang="less" scoped>
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
</style>
