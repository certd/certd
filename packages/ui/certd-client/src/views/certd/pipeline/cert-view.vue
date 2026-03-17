<template>
  <div class="cert-view">
    <div class="cert-detail mt-4">
      <a-descriptions class="w-full" bordered :column="2" size="small">
        <a-descriptions-item label="主域名">
          <a-tag color="blue">{{ props.cert.detail?.domains?.commonName || "-" }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="颁发机构">
          <a-tag color="green">{{ props.cert.detail?.issuer?.commonName || "-" }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="备用域名" :span="2">
          <a-tag v-for="(domain, index) in props.cert.detail?.domains?.altNames || []" :key="index" color="blue">
            {{ domain }}
          </a-tag>
          <span v-if="!props.cert.detail?.domains?.altNames?.length">-</span>
        </a-descriptions-item>
        <a-descriptions-item label="生效时间">
          {{ formatDate(props.cert.detail?.notBefore) }}
        </a-descriptions-item>
        <a-descriptions-item label="过期时间">
          {{ formatDate(props.cert.detail?.notAfter) }}
        </a-descriptions-item>
        <a-descriptions-item label="指纹">
          <div class="w-full flex flex-col fingerprint">
            <div class="flex flex-nowrap">
              <span class="font-bold label">SHA-1:</span> <fs-copyable class="inline-flex overflow-ellipsis text" :model-value="props.cert.detail?.fingerprints?.fingerprint || '-'"></fs-copyable>
            </div>
            <div class="flex flex-nowrap mt-1">
              <span class="font-bold label">SHA-256:</span> <fs-copyable class="inline-flex overflow-ellipsis text" :model-value="props.cert.detail?.fingerprints?.fingerprint256 || '-'"></fs-copyable>
            </div>
            <div class="flex flex-nowrap mt-1">
              <span class="font-bold label">SHA-512:</span> <fs-copyable class="inline-flex overflow-ellipsis text" :model-value="props.cert.detail?.fingerprints?.fingerprint512 || '-'"></fs-copyable>
            </div>
          </div>
        </a-descriptions-item>
      </a-descriptions>
    </div>
    <a-list item-layout="vertical" :data-source="certFiles" class="cert-content">
      <template #renderItem="{ item }">
        <a-list-item key="item.key">
          <a-list-item-meta>
            <template #title>
              <div class="title">
                <div class="font-bold">{{ item.name }}({{ item.fileName }})</div>
                <fs-copyable :model-value="item.content" :button="{ show: false }">
                  <a-tag color="success">复制</a-tag>
                </fs-copyable>
              </div>
            </template>
          </a-list-item-meta>
          <div>
            <a-textarea :value="item.content" :rows="5" />
          </div>
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>
<script setup lang="ts">
import { CertInfo } from "/@/views/certd/pipeline/api";
import { ref } from "vue";

const props = defineProps<{
  cert: CertInfo;
}>();

const certFiles = ref([
  { name: "证书", fileName: "fullchain.pem", key: "crt", content: props.cert.crt },
  { name: "私钥", fileName: "private.pem", key: "key", content: props.cert.key },
  { name: "中间证书", fileName: "chain.pem", key: "ic", content: props.cert.ic },
]);

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
</script>

<style lang="less">
.cert-view {
  margin-right: 25px;
  .title {
    display: flex;
    justify-content: space-between;
  }
  .ant-list-item-meta {
    margin-block-end: 0px !important;
    margin-top: 10px;
  }

  .cert-detail {
    table {
      width: 100%;
      table-layout: fixed !important;
    }
    .ant-descriptions-item-label {
      width: 90px;
    }
    .fingerprint {
      .label {
        width: 70px;
        flex-shrink: 0;
      }
      .text {
        white-space: nowrap;
        overflow: hidden;
        flex-grow: 1;
      }
    }
  }
  .cert-content {
    .ant-list-item {
      padding-left: 0;
      padding-right: 0;
    }
  }
}
</style>
