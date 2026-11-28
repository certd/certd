<template>
  <div class="ca-access">
    <a-alert v-if="caType === 'root'" type="info" show-icon class="mb-3" :message="t('certd.localCa.rootGrantHint')" />
    <template v-if="caType === 'intermediate'">
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
    </template>
    <a-modal
      v-model:open="removeModalOpen"
      :title="t('certd.localCa.grantRemoveTitle')"
      :confirm-loading="removing"
      :ok-text="t('certd.common.confirm')"
      :cancel-text="t('certd.common.cancel')"
      :z-index="1200"
      @ok="doRemoveGrant"
    >
      <p>{{ t("certd.localCa.grantRemoveContent", { user: removeTargetLabel }) }}</p>
      <a-checkbox v-model:checked="disableAccounts">{{ t("certd.localCa.grantRemoveDisableAccounts") }}</a-checkbox>
      <div class="helper">{{ t("certd.localCa.grantRemoveDisableAccountsHelper") }}</div>
    </a-modal>
  </div>
</template>

<script setup lang="tsx">
import { computed, onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
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
const loading = ref(false);
const saving = ref(false);
const grants = ref<any[]>([]);
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

function userLabel(id: number) {
  return userOptions.value.find(item => item.value === Number(id))?.label || `#${id}`;
}
function projectLabel(id: number) {
  return projectOptions.value.find(item => item.value === Number(id))?.label || `#${id}`;
}

async function load() {
  if (props.caType !== "intermediate") {
    grants.value = [];
    return;
  }
  loading.value = true;
  try {
    grants.value = (await localCaApi.ListGrants(props.caId)) || [];
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

const removeModalOpen = ref(false);
const removing = ref(false);
const disableAccounts = ref(true);
const removeTargetRecord = ref<any>(null);
const removeTargetLabel = ref("");

function removeGrant(record: any) {
  removeTargetRecord.value = record;
  removeTargetLabel.value = record.userId > 0 ? userLabel(record.userId) : projectLabel(record.projectId);
  disableAccounts.value = true;
  removeModalOpen.value = true;
}

async function doRemoveGrant() {
  const record = removeTargetRecord.value;
  if (!record) {
    return;
  }
  removing.value = true;
  try {
    const ok = await props.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), async () => {
      await localCaApi.RemoveGrant(props.caId, record.id, disableAccounts.value);
      notification.success({ message: t("certd.localCa.accessRemoved") });
      await load();
    });
    if (ok) {
      removeModalOpen.value = false;
    }
  } finally {
    removing.value = false;
  }
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
  .helper {
    font-size: 12px;
    color: var(--text-color-3, #999);
    margin-top: 6px;
  }
}
</style>
