<template>
  <div class="acme-access">
    <a-alert v-if="acmeMode === 'local'" type="success" show-icon class="mb-3" :message="t('certd.localCa.acmeModeLocalHint')" />
    <a-alert v-else type="warning" show-icon class="mb-3" :message="t('certd.localCa.acmeModeStandardRisk')" :description="t('certd.localCa.acmeModeStandardRiskDesc')" />
    <a-alert type="info" show-icon class="mb-3" :message="t('certd.localCa.acmeAccessHint')" />
    <a-spin :spinning="loading">
      <a-form layout="vertical">
        <a-form-item :label="t('certd.localCa.acmeIpAllowlist')">
          <a-textarea v-model:value="ipText" :rows="3" :placeholder="'10.0.0.0/8\n192.168.1.0/24\n2001:db8::/32'" />
          <div class="helper">{{ t("certd.localCa.acmeIpAllowlistHelper") }}</div>
        </a-form-item>

        <a-form-item :label="t('certd.localCa.acmeBasicAuth')">
          <a-switch v-model:checked="basicEnabled" />
          <span class="ml-2">{{ basicEnabled ? t("certd.common.enabled") : t("certd.common.disabled") }}</span>
          <div class="helper warning">{{ t("certd.localCa.acmeCompatWarning") }}</div>
          <div v-if="basicEnabled" class="basic-fields">
            <a-input v-model:value="basicUsername" :placeholder="t('certd.localCa.acmeBasicUsername')" class="mb-2" />
            <a-input-password v-model:value="basicPassword" :placeholder="t('certd.localCa.acmeBasicPassword')" autocomplete="new-password" />
            <div class="helper">{{ t("certd.localCa.acmeBasicPasswordHelper") }}</div>
          </div>
        </a-form-item>

        <a-form-item :label="t('certd.localCa.acmeRequiredHeaders')">
          <div v-for="(h, i) in headers" :key="i" class="header-row">
            <a-input v-model:value="h.name" placeholder="X-ACME-AUTH" class="header-name" />
            <a-input v-model:value="h.value" placeholder="certd" class="header-value" />
            <a-button type="link" danger size="small" @click="headers.splice(i, 1)">{{ t("certd.common.delete") }}</a-button>
          </div>
          <a-button type="dashed" size="small" @click="headers.push({ name: '', value: '' })">+ {{ t("certd.localCa.acmeAddHeader") }}</a-button>
          <div class="helper warning">{{ t("certd.localCa.acmeCompatWarning") }}</div>
        </a-form-item>

        <a-button type="primary" :loading="saving" @click="save">{{ t("certd.common.save") }}</a-button>
      </a-form>
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";
import { getSecretAccessToken } from "/@/views/certd/access/api";

defineOptions({ name: "LocalCaAcmeAccess" });

const props = defineProps<{
  caId: number;
  runStepUp?: (action: () => Promise<void>) => Promise<void>;
}>();

const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const acmeMode = ref<"local" | "standard">("standard");
const ipText = ref("");
const basicEnabled = ref(false);
const basicUsername = ref("");
const basicPassword = ref("");
const headers = ref<{ name: string; value: string }[]>([]);

async function load() {
  loading.value = true;
  try {
    const cfg = await localCaApi.GetAcmeAccess(props.caId);
    acmeMode.value = cfg.acmeMode === "local" ? "local" : "standard";
    ipText.value = (cfg.ipAllowlist || []).join("\n");
    basicEnabled.value = cfg.basicAuth?.enabled === true;
    basicUsername.value = cfg.basicAuth?.username || "";
    basicPassword.value = "";
    headers.value = (cfg.requiredHeaders || []).map((h: any) => ({ name: h.name, value: h.value }));
  } finally {
    loading.value = false;
  }
}

async function save() {
  const action = async () => {
    saving.value = true;
    try {
      const ipAllowlist = ipText.value
        .split(/[\n,，\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const requiredHeaders = headers.value.filter(h => h.name.trim()).map(h => ({ name: h.name.trim(), value: h.value }));
      const basicAuth: any = { enabled: basicEnabled.value, username: basicUsername.value };
      if (basicPassword.value) {
        basicAuth.password = basicPassword.value;
      }
      await localCaApi.SetAcmeAccess(props.caId, { ipAllowlist, basicAuth, requiredHeaders }, getSecretAccessToken());
      notification.success({ message: t("certd.localCa.acmeAccessSaved") });
      await load();
    } finally {
      saving.value = false;
    }
  };
  if (props.runStepUp) {
    await props.runStepUp(action);
  } else {
    await action();
  }
}

onMounted(load);
</script>

<style lang="less" scoped>
.acme-access {
  .helper {
    font-size: 12px;
    color: var(--text-color-3, #999);
    margin-top: 4px;
    &.warning {
      color: #fa8c16;
    }
  }
  .basic-fields {
    margin-top: 8px;
  }
  .header-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    .header-name {
      width: 200px;
    }
    .header-value {
      flex: 1;
    }
  }
}
</style>
