<template>
  <div class="custom-acme-provider-list">
    <div v-for="(provider, index) in props.modelValue" :key="index" class="custom-acme-provider-row">
      <a-tag v-if="provider.builtIn" color="blue">{{ t("certd.sys.setting.customAcmeBuiltIn") }}</a-tag>
      <a-tag v-else color="orange">{{ t("certd.sys.setting.customAcmeTag") }}</a-tag>
      <span class="custom-acme-provider-title" :title="provider.directoryUrl">{{ provider.title }} 【{{ provider.sslProvider }}】</span>
      <span v-if="provider.reverseProxy" class="custom-acme-provider-proxy" :title="provider.reverseProxy">{{ provider.reverseProxy }}</span>
      <div class="custom-acme-provider-actions">
        <a-button type="link" size="small" @click="openEditor(index)">{{ t("common.edit") }}</a-button>
        <a-button v-if="!provider.builtIn" type="link" size="small" danger @click="removeProvider(index)">{{ t("common.delete") }}</a-button>
      </div>
    </div>
    <a-button class="custom-acme-provider-add" type="dashed" block @click="openEditor()">+ {{ t("certd.sys.setting.customAcmeAdd") }}</a-button>
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
      title: t("certd.sys.setting.customAcmeName"),
      type: "text",
      form: {
        show: hideForBuiltIn,
        rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
      },
    },
    sslProvider: {
      title: t("certd.sys.setting.customAcmeSslProvider"),
      type: "text",
      form: {
        show: hideForBuiltIn,
        rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
        helper: t("certd.sys.setting.customAcmeSslProviderHelper"),
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
        rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
        placeholder: "https://your-ca.example.com/directory",
        helper: "Directory URL of the ACME server (e.g., https://acme-v02.api.letsencrypt.org/directory)",
      },
    },
    reverseProxy: {
      title: t("certd.sys.setting.customAcmeReverseProxy"),
      type: "text",
      form: {
        required: false,
        placeholder: "myca-proxy.example.com",
        helper: t("certd.sys.setting.customAcmeReverseProxyHelper"),
      },
    },
    needEAB: {
      title: t("certd.sys.setting.customAcmeNeedEab"),
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
    title: isBuiltIn ? `${t("certd.sys.setting.customAcmeEdit")} - ${editing.title}` : editing ? t("certd.sys.setting.customAcmeEdit") : t("certd.sys.setting.customAcmeAdd"),
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
          message: t("certd.sys.setting.customAcmeSslProviderUnique"),
        });
        throw new Error(t("certd.sys.setting.customAcmeSslProviderUnique"));
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

function removeProvider(index: number) {
  const provider = props.modelValue[index];
  if (!provider) {
    return;
  }
  Modal.confirm({
    title: t("certd.sys.setting.customAcmeDeleteConfirmTitle"),
    content: t("certd.sys.setting.customAcmeDeleteConfirmContent", { title: provider.title }),
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
}
</style>
