<template>
  <div class="custom-acme-provider-list">
    <div v-for="(provider, index) in props.modelValue" :key="provider.sslProvider || index" class="custom-acme-provider-row">
      <a-tag v-if="provider.builtIn" color="blue">{{ t("certd.sys.settings.customAcmeBuiltIn") }}</a-tag>
      <a-tag v-else-if="provider.localCaId != null" color="green">{{ t("certd.sys.settings.customAcmeLocalCaTag") }}</a-tag>
      <a-tag v-else color="orange">{{ t("certd.sys.settings.customAcmeTag") }}</a-tag>
      <span class="custom-acme-provider-title" :title="provider.directoryUrl">{{ provider.title }} 【{{ providerLabel(provider) }}】</span>
      <span v-if="provider.reverseProxy" class="custom-acme-provider-proxy" :title="provider.reverseProxy">{{ provider.reverseProxy }}</span>
      <div v-if="provider.localCaId == null" class="custom-acme-provider-actions">
        <a-button type="link" size="small" @click="openEditor(index)">{{ t("common.edit") }}</a-button>
        <a-button v-if="!provider.builtIn" type="link" size="small" danger @click="removeProvider(index)">{{ t("common.delete") }}</a-button>
      </div>
    </div>
    <a-button class="custom-acme-provider-add" type="dashed" block @click="openEditor()">+ {{ t("certd.sys.settings.customAcmeAdd") }}</a-button>
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { useFormDialog } from "/@/use/use-dialog";
import { Modal, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";

defineOptions({
  name: "CustomAcmeProviderList",
});

export type CustomAcmeProviderForm = {
  title: string;
  sslProvider: string;
  directoryUrl: string;
  reverseProxy?: string;
  needEAB?: boolean;
  builtIn?: boolean;
  localCaId?: number;
  enabled?: boolean;
};

const props = defineProps<{
  modelValue: CustomAcmeProviderForm[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: CustomAcmeProviderForm[]];
}>();

const { t } = useI18n();
const { openFormDialog } = useFormDialog();

// 没有本地CA同步条目时，不再显示“本地CA无需手动添加”的说明
const hasLocalCa = computed(() => (props.modelValue || []).some(item => item.localCaId != null));

/** 同步条目显示当前指向的CA标识（轮换后 localCaId 指向新CA，sslProvider 保持稳定不变） */
function providerLabel(provider: CustomAcmeProviderForm) {
  if (provider.localCaId != null) {
    return `local-ca-${provider.localCaId}`;
  }
  return provider.sslProvider;
}

/**
 * 构建编辑对话框的字段配置。
 * 内置颁发机构（builtIn=true）与本地CA同步条目（localCaId）只能配置反向代理地址，
 * 其余字段通过 show 动态隐藏；手动添加的自定义颁发机构显示全部字段。
 */
function buildColumns(editing: CustomAcmeProviderForm | null) {
  const hideForLocked = computed(() => editing?.builtIn !== true && editing?.localCaId == null);
  return {
    title: {
      title: t("certd.sys.settings.customAcmeName"),
      type: "text",
      form: {
        show: hideForLocked,
        rules: [{ required: true, message: t("certd.sys.settings.customAcmeSaveCheck") }],
      },
    },
    sslProvider: {
      title: t("certd.sys.settings.customAcmeSslProvider"),
      type: "text",
      form: {
        show: hideForLocked,
        rules: [{ required: true, message: t("certd.sys.settings.customAcmeSaveCheck") }],
        helper: t("certd.sys.settings.customAcmeSslProviderHelper"),
        component: {
          disabled: computed(() => !!editing?.sslProvider),
        },
      },
    },
    directoryUrl: {
      title: "Directory URL",
      type: "text",
      form: {
        show: hideForLocked,
        rules: [{ required: true, message: t("certd.sys.settings.customAcmeSaveCheck") }],
        placeholder: "https://your-ca.example.com/directory",
        helper: "Directory URL of the ACME server (e.g., https://acme-v02.api.letsencrypt.org/directory)",
      },
    },
    reverseProxy: {
      title: t("certd.sys.settings.customAcmeReverseProxy"),
      type: "text",
      form: {
        required: false,
        placeholder: "myca-proxy.example.com",
        helper: t("certd.sys.settings.customAcmeReverseProxyHelper"),
      },
    },
    needEAB: {
      title: t("certd.sys.settings.customAcmeNeedEab"),
      form: {
        show: hideForLocked,
        value: false,
        component: {
          name: "a-switch",
          vModel: "checked",
        },
      },
    },
  };
}

/**
 * 添加（index 为空）或编辑（index 指定）颁发机构。
 * 内置颁发机构/本地CA同步条目：只允许配置反向代理地址，其他字段保留原值；
 * 手动添加的自定义颁发机构：可编辑全部字段。
 */
async function openEditor(index?: number) {
  const editing = index != null ? props.modelValue[index] : null;
  const isBuiltIn = editing?.builtIn === true;
  const isSynced = editing?.localCaId != null;
  const isLocked = isBuiltIn || isSynced;
  let dialogTitle = t("certd.sys.settings.customAcmeAdd");
  if (editing) {
    if (isLocked) {
      dialogTitle = `${t("certd.sys.settings.customAcmeEdit")} - ${editing.title}`;
    } else {
      dialogTitle = t("certd.sys.settings.customAcmeEdit");
    }
  }
  let dialogBody: (() => any) | undefined;
  if (isSynced) {
    dialogBody = () => <a-alert class="mb-4" type="info" show-icon message={t("certd.sys.settings.customAcmeLocalCaSyncedTitle")} description={t("certd.sys.settings.customAcmeLocalCaSyncedHelp")} />;
  } else if (!isBuiltIn && hasLocalCa.value) {
    dialogBody = () => <a-alert class="local-ca-acme-help mb-4" type="info" show-icon message={t("certd.sys.settings.customAcmeLocalCaHelpTitle")} description={t("certd.sys.settings.customAcmeLocalCaHelpContent")} />;
  }
  await openFormDialog({
    title: dialogTitle,
    body: dialogBody,
    columns: buildColumns(editing),
    initialForm: editing ? { ...editing, needEAB: editing.needEAB ?? false } : { needEAB: false },
    onSubmit: async (form: any) => {
      // 内置/同步条目：仅更新反向代理地址，其他字段（含 localCaId/enabled）保留
      if (isLocked) {
        const list = [...props.modelValue];
        // 提交时重读当前快照，避免对话框开启期间列表变化导致旧数据覆盖
        const current = list[index!] || editing;
        list[index!] = { ...current, reverseProxy: form.reverseProxy || "" };
        emit("update:modelValue", list);
        return;
      }
      // sslProvider 唯一性校验（编辑时排除自身）
      const duplicated = props.modelValue.some((provider, i) => provider.sslProvider === form.sslProvider && i !== index);
      if (duplicated) {
        notification.warning({
          message: t("certd.sys.settings.customAcmeSslProviderUnique"),
        });
        throw new Error(t("certd.sys.settings.customAcmeSslProviderUnique"));
      }
      const list = [...props.modelValue];
      const bean: CustomAcmeProviderForm = {
        ...editing,
        title: form.title,
        sslProvider: form.sslProvider,
        directoryUrl: form.directoryUrl,
        reverseProxy: form.reverseProxy || "",
        needEAB: form.needEAB === true,
        builtIn: false,
      };
      if (editing) {
        list[index!] = bean;
      } else {
        list.push(bean);
      }
      // 通过 emit 同步给父组件，保证表单数据一致
      emit("update:modelValue", list);
    },
  });
}

function removeProvider(index: number) {
  const provider = props.modelValue[index];
  if (!provider || provider.localCaId != null) {
    return;
  }
  Modal.confirm({
    title: t("certd.sys.settings.customAcmeDeleteConfirmTitle"),
    content: t("certd.sys.settings.customAcmeDeleteConfirmContent", { title: provider.title }),
    onOk() {
      const list = [...props.modelValue];
      list.splice(index, 1);
      emit("update:modelValue", list);
    },
  });
}
</script>
<style lang="less">
.custom-acme-provider-list {
  .custom-acme-provider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--border-color, #e8e8e8);
    border-radius: 4px;
    margin-bottom: 8px;

    .custom-acme-provider-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .custom-acme-provider-proxy {
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: var(--text-color-3, #999);
    }

    .custom-acme-provider-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .custom-acme-provider-add {
    margin-top: 4px;
  }
}

.local-ca-acme-help .ant-alert-description {
  white-space: pre-line;
}
</style>
