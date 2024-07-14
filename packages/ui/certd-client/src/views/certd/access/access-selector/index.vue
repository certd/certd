<template>
  <div class="pi-access-selector">
    <span v-if="target.name" class="mr-5 cd-flex-inline">
      <span class="mr-5">{{ target.name }}</span>
      <fs-icon class="cd-icon-button" icon="ion:close-circle-outline" @click="clear"></fs-icon>
    </span>
    <span v-else class="mlr-5 gray">请选择</span>
    <a-button class="ml-5" @click="chooseForm.open">选择</a-button>
    <a-form-item-rest v-if="chooseForm.show">
      <a-modal v-model:open="chooseForm.show" title="选择授权提供者" width="900px" @ok="chooseForm.ok">
        <div style="height: 400px; position: relative">
          <cert-access-modal v-model="selectedId" :type="type"></cert-access-modal>
        </div>
      </a-modal>
    </a-form-item-rest>
  </div>
</template>

<script>
import { defineComponent, reactive, ref, watch } from "vue";
import * as api from "../api";
import CertAccessModal from "./access/index.vue";
import { GetProviderDefineByAccessType } from "../api";

export default defineComponent({
  name: "PiAccessSelector",
  components: { CertAccessModal },
  props: {
    modelValue: {
      type: [Number, String],
      default: null
    },
    type: {
      type: String,
      default: "aliyun"
    }
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const target = ref({});
    const selectedId = ref();
    async function refreshTarget(value) {
      selectedId.value = value;
      if (value > 0) {
        target.value = await api.GetObj(value);
      }
    }

    function clear() {
      selectedId.value = "";
      target.value = null;
      ctx.emit("update:modelValue", selectedId.value);
    }

    watch(
      () => {
        return props.modelValue;
      },
      async (value) => {
        selectedId.value = null;
        target.value = {};
        if (value == null) {
          return;
        }
        await refreshTarget(value);
      },
      {
        immediate: true
      }
    );

    const providerDefine = ref({});

    async function refreshProviderDefine(type) {
      providerDefine.value = await api.GetProviderDefine(type);
    }
    watch(
      () => {
        return props.type;
      },
      async (value) => {
        await refreshProviderDefine(value);
      },
      {
        immediate: true
      }
    );

    const chooseForm = reactive({
      show: false,
      open() {
        chooseForm.show = true;
      },
      ok: () => {
        chooseForm.show = false;
        console.log("choose ok:", selectedId.value);
        refreshTarget(selectedId.value);
        ctx.emit("update:modelValue", selectedId.value);
      }
    });

    return {
      clear,
      target,
      selectedId,
      providerDefine,
      chooseForm
    };
  }
});
</script>
<style lang="less">
.access-selector {
}
</style>
