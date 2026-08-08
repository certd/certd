<template>
  <div class="cert-info-updater w-full flex items-center">
    <div class="flex-o">
      <a-tag>{{ domain }}</a-tag>
      <fs-button type="primary" size="small" class="ml-1" icon="ion:upload" text="更新证书" @click="onUploadClick" />
    </div>
  </div>
</template>

<script lang="tsx" setup>
import { computed, inject, watch, ref } from "vue";
import { useCertUpload } from "./use";
import { getAllDomainsFromCrt } from "/@/views/certd/pipeline/utils";

defineOptions({
  name: "CertInfoUpdater",
});

const props = defineProps<{
  modelValue?: { crt: string; key: string };
  type?: string;
  placeholder?: string;
  size?: string;
  disabled?: boolean;
}>();
const emit = defineEmits(["updated", "update:modelValue"]);

const { openUpdateCertDialog } = useCertUpload();

const domainsRef = ref([]);

watch(
  () => {
    return props.modelValue?.crt;
  },
  async crt => {
    if (crt) {
      domainsRef.value = await getAllDomainsFromCrt(crt);
    } else {
      domainsRef.value = [];
    }

    emit("updated", { domains: domainsRef.value });
  },
  {
    immediate: true,
  }
);

const domain = computed(() => {
  if (domainsRef.value && domainsRef.value.length > 0) {
    return domainsRef.value[0];
  }

  return "";
});

async function onUpdated(res: { uploadCert: any }) {
  emit("update:modelValue", res.uploadCert);
}

const pipeline: any = inject("pipeline");
function onUploadClick() {
  openUpdateCertDialog({
    onSubmit: onUpdated,
  });
}
</script>
<style lang="less">
.cert-info-selector {
  width: 100%;
}
</style>
