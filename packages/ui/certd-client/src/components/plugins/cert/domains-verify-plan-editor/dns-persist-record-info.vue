<template>
  <tbody class="dns-persist-record-info">
    <tr v-if="dnsPersistRecord">
      <td class="host-record" :title="dnsPersistRecord.hostRecord">
        <fs-copyable v-model="dnsPersistRecord.hostRecord"></fs-copyable>
      </td>
      <td style="text-align: center">TXT</td>
      <td class="record-value" :title="dnsPersistRecord.recordValue">
        <fs-copyable v-model="dnsPersistRecord.recordValue"></fs-copyable>
      </td>
      <td class="status center">
        <fs-values-format v-model="dnsPersistRecord.status" :dict="statusDict" />
      </td>
      <td class="center">
        <template v-if="dnsPersistRecord.status !== 'valid'">
          <a-space>
            <a-button type="primary" size="small" @click="openSettingDialog">设置TXT</a-button>
            <a-button type="primary" size="small" :loading="loading" @click="doVerify">校验</a-button>
          </a-space>
        </template>
        <div v-else class="helper">请勿删除TXT记录</div>
      </td>
    </tr>
    <tr v-else>
      <td colspan="5" class="color-red">{{ errorMessage || "请先选择ACME账号授权" }}</td>
    </tr>
  </tbody>
</template>

<script lang="ts" setup>
import { dict } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
import { ref, watch } from "vue";
import { GetByDomain, Verify } from "/@/views/certd/cert/dns-persist/api";
import { useDnsPersistSettingDialog } from "/@/views/certd/cert/dns-persist/use-setting-dialog";
import { DnsPersistRecord } from "./type";

defineOptions({
  name: "DnsPersistRecordInfo",
});

const props = defineProps<{
  domain: string;
  caType?: string;
  acmeAccountAccessId?: number;
  commonAcmeAccountAccessId?: number;
  wildcard?: boolean;
  persistUntil?: number;
}>();

const emit = defineEmits<{
  change: [DnsPersistRecord];
}>();

const statusDict = dict({
  data: [
    { value: "pending", label: "待设置", color: "warning" },
    { value: "validating", label: "校验中", color: "blue" },
    { value: "valid", label: "有效", color: "green" },
    { value: "failed", label: "请重试", color: "red" },
  ],
});

const dnsPersistRecord = ref<DnsPersistRecord | null>(null);
const loading = ref(false);
const errorMessage = ref("");
const { openDnsPersistSettingDialog } = useDnsPersistSettingDialog();

function onRecordChange() {
  if (dnsPersistRecord.value) {
    emit("change", dnsPersistRecord.value);
  } else {
    emit("change", {
      domain: props.domain,
      status: null,
    } as any);
  }
}

async function loadRecord() {
  errorMessage.value = "";
  dnsPersistRecord.value = null;
  if (!props.domain || (!props.acmeAccountAccessId && !props.commonAcmeAccountAccessId)) {
    onRecordChange();
    return;
  }
  try {
    dnsPersistRecord.value = await GetByDomain({
      domain: props.domain,
      caType: props.caType,
      acmeAccountAccessId: props.acmeAccountAccessId,
      commonAcmeAccountAccessId: props.commonAcmeAccountAccessId,
      wildcard: props.wildcard,
      persistUntil: props.persistUntil,
      createOnNotFound: true,
    });
    onRecordChange();
  } catch (e: any) {
    errorMessage.value = e.message;
  }
}

watch(
  () => [props.domain, props.caType, props.acmeAccountAccessId, props.commonAcmeAccountAccessId, props.wildcard, props.persistUntil],
  async () => {
    await loadRecord();
  },
  {
    immediate: true,
  }
);

async function doVerify() {
  if (!dnsPersistRecord.value?.id) {
    return;
  }
  loading.value = true;
  try {
    const ok = await Verify(dnsPersistRecord.value.id);
    message[ok ? "success" : "error"](ok ? "校验成功" : "未找到匹配的TXT记录，请稍后重试");
    await loadRecord();
  } finally {
    loading.value = false;
  }
}

function openSettingDialog() {
  if (!dnsPersistRecord.value) {
    return;
  }
  openDnsPersistSettingDialog({
    record: dnsPersistRecord.value,
    onDone: loadRecord,
  });
}
</script>

<style lang="less">
.dns-persist-record-info {
  .fs-copyable {
    width: 100%;
  }
}
</style>
