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
          <a-tag v-for="(domain, index) in altNames" :key="index" color="blue">
            {{ domain }}
          </a-tag>
          <span v-if="!altNames.length">-</span>
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
      <a-descriptions v-if="isLocalCa" class="w-full mt-4" bordered :column="2" size="small">
        <a-descriptions-item label="序列号" :span="2">
          <fs-copyable :model-value="certSerialNumber">{{ certSerialNumber }}</fs-copyable>
        </a-descriptions-item>
        <a-descriptions-item label="证书状态">
          <a-tag :color="statusColor">{{ statusLabel }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="签名算法">{{ props.cert.x509?.signatureAlgorithm || "-" }}</a-descriptions-item>
        <a-descriptions-item label="密钥用途">{{ (props.cert.x509?.keyUsage || []).join(", ") || "-" }}</a-descriptions-item>
        <a-descriptions-item label="扩展用途">{{ extKeyUsageText }}</a-descriptions-item>
        <a-descriptions-item label="证书链">{{ chainCount }} 张</a-descriptions-item>
        <a-descriptions-item label="吊销时间">{{ props.cert.revokeTime ? formatDate(props.cert.revokeTime) : "-" }}</a-descriptions-item>
        <a-descriptions-item v-if="crlUrl" label="CRL地址" :span="2">
          <fs-copyable :model-value="crlUrl">{{ crlUrl }}</fs-copyable>
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
import { computed } from "vue";
import { env } from "/@/utils/util.env";

const props = defineProps<{
  cert: CertInfo;
}>();

const isLocalCa = computed(() => Boolean(props.cert.localCaId || props.cert.x509));
const altNames = computed(() => {
  const commonName = props.cert.detail?.domains?.commonName;
  const list = props.cert.detail?.domains?.altNames || [];
  return [...new Set(list.filter((item: string) => item !== commonName))];
});
const certSerialNumber = computed(() => props.cert.x509?.serialNumber || props.cert.serialNumber || "-");
const statusLabel = computed(() => {
  if (props.cert.status === "revoked") return "已吊销";
  if (props.cert.status === "inactive") return "已替换";
  return "有效";
});
const statusColor = computed(() => {
  if (props.cert.status === "revoked") return "red";
  if (props.cert.status === "inactive") return "orange";
  return "green";
});
const extKeyUsageText = computed(() => {
  const map: any = {
    serverAuth: "服务器认证",
    clientAuth: "客户端认证",
    codeSigning: "代码签名",
    emailProtection: "邮件保护",
    timeStamping: "时间戳",
    ocspSigning: "OCSP签名",
  };
  const list = props.cert.x509?.extKeyUsage || [];
  return list.map((item: string) => map[item] || item).join(", ") || "-";
});
const chainCount = computed(() => (String(props.cert.crt || "").match(/BEGIN CERTIFICATE/g) || []).length);
const crlUrl = computed(() => {
  if (props.cert.crlUrl) return props.cert.crlUrl;
  if (!props.cert.localCaId) return "";
  return `${env.API}/sys/local-ca/crl?id=${props.cert.localCaId}`;
});

const certFiles = computed(() => {
  return [
    { name: "证书", fileName: "fullchain.pem", key: "crt", content: props.cert.crt },
    { name: "私钥", fileName: "private.pem", key: "key", content: props.cert.key },
    { name: "中间证书", fileName: "chain.pem", key: "ic", content: props.cert.ic },
  ].filter(item => item.content);
});

function formatDate(dateStr: any): string {
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
