<template>
  <div class="cert-view">
    <a-list item-layout="vertical" :data-source="certFiles">
      <template #renderItem="{ item }">
        <a-list-item key="item.key">
          <a-list-item-meta>
            <template #title>
              <div class="title">
                <div>{{ item.name }}({{ item.fileName }})</div>
                <fs-copyable :model-value="item.content" :button="{ show: false }">
                  <a-tag color="success">复制</a-tag>
                </fs-copyable>
              </div>
            </template>
          </a-list-item-meta>
          <div>
            <a-textarea :value="item.content" rows="5" />
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
  { name: "中间证书", fileName: "chain.pem", key: "ic", content: props.cert.ic }
]);
</script>

<style lang="less">
.cert-view {
  .title {
    display: flex;
    justify-content: space-between;
  }
  .ant-list-item-meta {
    margin-block-end: 0px !important;
    margin-top: 10px;
  }
}
</style>
