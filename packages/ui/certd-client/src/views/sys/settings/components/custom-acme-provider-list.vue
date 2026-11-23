<template>
  <div class="custom-acme-provider-list">
    <div v-for="(provider, index) in props.modelValue" :key="index" class="custom-acme-provider-row">
      <a-tag v-if="provider.builtIn" color="blue">{{ t("certd.sys.settings.customAcmeBuiltIn") }}</a-tag>
      <a-tag v-else color="orange">{{ t("certd.sys.settings.customAcmeTag") }}</a-tag>
      <span class="custom-acme-provider-title" :title="provider.directoryUrl">{{ provider.title }} 【{{ provider.sslProvider }}】</span>
      <span v-if="provider.reverseProxy" class="custom-acme-provider-proxy" :title="provider.reverseProxy">{{ provider.reverseProxy }}</span>
      <div class="custom-acme-provider-actions">
        <a-button type="link" size="small" @click="openEditor(index)">{{ t("common.edit") }}</a-button>
        <a-button v-if="!provider.builtIn" type="link" size="small" danger @click="removeProvider(index)">{{ t("common.delete") }}</a-button>
      </div>
    </div>
    <a-button class="custom-acme-provider-add" type="dashed" block @click="openEditor()">+ {{ t("certd.sys.settings.customAcmeAdd") }}</a-button>
    <a-button class="custom-acme-provider-quick-add" type="dashed" block @click="openQuickAdd">+ {{ t("certd.sys.settings.customAcmeLocalCaQuickAdd") }}</a-button>
  </div>
</template>

<script setup lang="tsx">
import { computed } from "vue";
import { dict } from "@fast-crud/fast-crud";
import { useFormDialog } from "/@/use/use-dialog";
import { Modal, notification } from "ant-design-vue";
import { useI18n } from "/src/locales";
import { localCaApi } from "/@/views/certd/cert/local-ca/api";

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
};

const props = defineProps<{
  modelValue: CustomAcmeProviderForm[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: CustomAcmeProviderForm[]];
}>();

const { t } = useI18n();
const { openFormDialog } = useFormDialog();

/**
 * 构建编辑对话框的字段配置。
 * 内置颁发机构（builtIn=true）只能配置反向代理地址，其余字段通过 show 动态隐藏；
 * 自定义颁发机构显示全部字段。
 */
function buildColumns(editing: CustomAcmeProviderForm | null) {
  // 内置项隐藏除反向代理外的字段
  const hideForBuiltIn = computed(() => editing?.builtIn !== true);
  return {
    title: {
      title: t("certd.sys.settings.customAcmeName"),
      type: "text",
      form: {
        show: hideForBuiltIn,
        rules: [{ required: true, message: t("certd.sys.settings.customAcmeSaveCheck") }],
      },
    },
    sslProvider: {
      title: t("certd.sys.settings.customAcmeSslProvider"),
      type: "text",
      form: {
        show: hideForBuiltIn,
        rules: [{ required: true, message: t("certd.sys.settings.customAcmeSaveCheck") }],
        helper: t("certd.sys.settings.customAcmeSslProviderHelper"),
        component: {
          disabled: computed(() => editing?.sslProvider),
        },
      },
    },
    directoryUrl: {
      title: "Directory URL",
      type: "text",
      form: {
        show: hideForBuiltIn,
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
        show: hideForBuiltIn,
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
 * 内置颁发机构：只允许配置反向代理地址（Directory URL 走内置端点，不允许修改）；
 * 自定义颁发机构：可编辑全部字段。
 */
async function openEditor(index?: number) {
  const editing = index != null ? props.modelValue[index] : null;
  const isBuiltIn = editing?.builtIn === true;
  await openFormDialog({
    title: isBuiltIn ? `${t("certd.sys.settings.customAcmeEdit")} - ${editing.title}` : editing ? t("certd.sys.settings.customAcmeEdit") : t("certd.sys.settings.customAcmeAdd"),
    columns: buildColumns(editing),
    initialForm: editing ? { ...editing, needEAB: editing.needEAB ?? false } : { needEAB: false },
    onSubmit: async (form: any) => {
      // 内置颁发机构：仅更新反向代理地址，其他字段保留
      if (isBuiltIn) {
        const list = [...props.modelValue];
        list[index!] = { ...editing, reverseProxy: form.reverseProxy || "" };
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

/**
 * 快速添加本地CA的ACME颁发机构：只列出已启用ACME的中间CA，自动填充名称、标识和Directory URL。
 * 仅修改当前表单数据，仍需用户点击页面底部的「保存」才会写入系统设置。
 */
async function openQuickAdd() {
  const options = await localCaApi.GetOptions();
  const candidates = (options || []).filter((ca: any) => ca.caType === "intermediate" && ca.acmeEnabled && !ca.disabled && (!ca.notAfter || Number(ca.notAfter) > Date.now()));
  if (candidates.length === 0) {
    notification.warning({ message: t("certd.sys.settings.customAcmeLocalCaQuickAddEmpty") });
    return;
  }
  const caDict = dict({
    data: candidates.map((ca: any) => ({
      value: ca.id,
      label: ca.subjectCn ? `${ca.name} (${ca.subjectCn})` : ca.name,
    })),
  });
  await openFormDialog({
    title: t("certd.sys.settings.customAcmeLocalCaQuickAddTitle"),
    body: () => <a-alert class="mb-4" type="info" show-icon message={t("certd.sys.settings.customAcmeLocalCaQuickAddHelp")} />,
    columns: {
      caId: {
        title: t("certd.sys.settings.customAcmeLocalCaQuickAddSelect"),
        type: "dict-select",
        dict: caDict,
        form: {
          required: true,
          col: { span: 24 },
        },
      },
    },
    onSubmit: async (form: any) => {
      const ca = candidates.find((item: any) => Number(item.id) === Number(form.caId));
      if (!ca) {
        throw new Error(t("certd.sys.settings.customAcmeLocalCaQuickAddEmpty"));
      }
      // 使用后端解析后的CA访问地址，避免与ACME服务实际生成的端点地址不一致
      const baseUrl = String(ca.baseUrl || "").replace(/\/+$/, "");
      if (!baseUrl) {
        notification.error({ message: t("certd.sys.settings.customAcmeLocalCaQuickAddNoBaseUrl") });
        throw new Error(t("certd.sys.settings.customAcmeLocalCaQuickAddNoBaseUrl"));
      }
      const directoryUrl = `${baseUrl}/api/acme/${ca.id}/directory`;
      const sslProvider = `local-ca-${ca.id}`;
      const duplicated = props.modelValue.some(item => item.sslProvider === sslProvider || item.directoryUrl === directoryUrl);
      if (duplicated) {
        notification.warning({ message: t("certd.sys.settings.customAcmeLocalCaQuickAddExists") });
        throw new Error(t("certd.sys.settings.customAcmeLocalCaQuickAddExists"));
      }
      emit("update:modelValue", [
        ...props.modelValue,
        {
          title: t("certd.sys.settings.customAcmeLocalCaQuickAddProviderName", { name: ca.name }),
          sslProvider,
          directoryUrl,
          reverseProxy: "",
          needEAB: true,
          builtIn: false,
        },
      ]);
      notification.success({ message: t("certd.sys.settings.customAcmeLocalCaQuickAddSuccess") });
    },
  });
}

function removeProvider(index: number) {
  const provider = props.modelValue[index];
  if (!provider) {
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
    }
  }

  .custom-acme-provider-add {
    margin-top: 4px;
  }

  .custom-acme-provider-quick-add {
    margin-top: 8px;
  }
}
</style>
