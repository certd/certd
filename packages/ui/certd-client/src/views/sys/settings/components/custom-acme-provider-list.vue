<template>
  <div class="custom-acme-provider-list">
    <div v-for="(provider, index) in props.modelValue" :key="index" class="custom-acme-provider-row">
      <a-tag v-if="provider.builtIn" color="blue">{{ t("certd.sys.setting.customAcmeBuiltIn") }}</a-tag>
      <a-tag v-else color="orange">{{ t("certd.sys.setting.customAcmeTag") }}</a-tag>
      <span class="custom-acme-provider-title" :title="provider.directoryUrl">{{ provider.title }}</span>
      <div class="custom-acme-provider-actions">
        <a-button v-if="!provider.builtIn" type="link" size="small" @click="openEditor(index)">{{ t("common.edit") }}</a-button>
        <a-button v-if="!provider.builtIn" type="link" size="small" danger @click="removeProvider(index)">{{ t("common.delete") }}</a-button>
      </div>
    </div>
    <a-button class="custom-acme-provider-add" type="dashed" block @click="openEditor()">+ {{ t("certd.sys.setting.customAcmeAdd") }}</a-button>
  </div>
</template>

<script setup lang="tsx">
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

const columns = {
  title: {
    title: t("certd.sys.setting.customAcmeName"),
    type: "text",
    form: {
      rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
    },
  },
  sslProvider: {
    title: t("certd.sys.setting.customAcmeSslProvider"),
    type: "text",
    form: {
      rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
      helper: t("certd.sys.setting.customAcmeSslProviderHelper"),
    },
  },
  directoryUrl: {
    title: "Directory URL",
    type: "text",
    form: {
      rules: [{ required: true, message: t("certd.sys.setting.customAcmeSaveCheck") }],
      placeholder: "https://your-ca.example.com/directory",
    },
  },
  reverseProxy: {
    title: t("certd.sys.setting.customAcmeReverseProxy"),
    type: "text",
    form: {
      required: false,
      placeholder: "myca-proxy.example.com",
    },
  },
  needEAB: {
    title: t("certd.sys.setting.customAcmeNeedEab"),
    form: {
      value: false,
      component: {
        name: "a-switch",
        vModel: "checked",
      },
    },
  },
};

/**
 * 添加（index 为空）或编辑（index 指定）自定义ACME
 */
async function openEditor(index?: number) {
  const editing = index != null ? props.modelValue[index] : null;
  await openFormDialog({
    title: editing ? t("certd.sys.setting.customAcmeEdit") : t("certd.sys.setting.customAcmeAdd"),
    columns,
    initialForm: editing ? { ...editing } : { needEAB: false },
    onSubmit: async (form: any) => {
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
