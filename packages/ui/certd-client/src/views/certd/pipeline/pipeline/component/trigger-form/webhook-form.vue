<template>
  <div>
    <a-form-item label="Webhook URL">
      <div class="flex flex-col h-8 border-dashed border-2 rounded-md p-1">
        <fs-copyable :model-value="webhookUrl" class="flex-1 overflow-hidden"></fs-copyable>
      </div>
      <a-button class="mt-2" type="primary" size="small" @click="refreshWebhookKey">重新生成</a-button>
      <div class="helper">支持post和get请求</div>
    </a-form-item>
  </div>
</template>

<script lang="tsx" setup>
import { Modal } from "ant-design-vue";
import { computed, inject, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import * as api from "./api";
defineOptions({
  name: "WebhookForm",
});

const props = defineProps<{
  editMode: boolean;
}>();
const { t } = useI18n();
const pipelineDetailGetter: any = inject("pipelineDetail:get");
const webhookUrl = computed(() => {
  const detailRef = pipelineDetailGetter();
  return `${window.location.origin}/api/webhook/${detailRef?.value?.webhookKey}`;
});
onMounted(() => {
  const detailRef = pipelineDetailGetter();
  if (!detailRef.value) {
    return;
  }
  if (!detailRef.value.webhookKey) {
    doRefreshWebhookKey();
  }
});

const refreshWebhookKey = () => {
  Modal.confirm({
    title: "确认重新生成Webhook URL吗？",
    okText: "确认",
    okType: "danger",
    onOk: async () => {
      await doRefreshWebhookKey();
    },
  });
};

async function doRefreshWebhookKey() {
  const detailRef = pipelineDetailGetter();
  const res = await api.RefreshWebhookKey({
    id: detailRef.value.id,
  });
  detailRef.value.webhookKey = res.webhookKey;
}
</script>
