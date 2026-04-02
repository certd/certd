<template>
  <div class="access-selector">
    <span v-if="modelValue" class="mr-5 cd-flex-inline">
      <a-tag class="mr-5" color="green">{{ target?.name || modelValue }}</a-tag>
      <fs-icon class="cd-icon-button" icon="ion:close-circle-outline" @click="clear"></fs-icon>
    </span>
    <span v-else class="mlr-5 text-gray">{{ placeholder }}</span>
    <a-button class="ml-5" :disabled="disabled" :size="size" @click="chooseForm.open">选择</a-button>
    <a-form-item-rest v-if="chooseForm.show">
      <a-modal v-model:open="chooseForm.show" title="选择授权提供者" width="900px" @ok="chooseForm.ok">
        <div style="height: 400px; position: relative">
          <cert-access-modal v-model="selectedId" :type="type" :from="from"></cert-access-modal>
        </div>
      </a-modal>
    </a-form-item-rest>
  </div>
</template>

<script>
import { defineComponent, reactive, ref, watch, inject } from "vue";
import CertAccessModal from "./access/index.vue";
import { createAccessApi } from "../api";
import { message } from "ant-design-vue";
import { useUserStore } from "/@/store/user";
import { useProjectStore } from "/@/store/project";
export default defineComponent({
  name: "AccessSelector",
  components: { CertAccessModal },
  props: {
    modelValue: {
      type: [Number, String],
      default: null,
    },
    type: {
      type: String,
      default: "aliyun",
    },
    placeholder: {
      type: String,
      default: "请选择",
    },
    size: {
      type: String,
      default: "middle",
    },
    from: {
      type: String, //user | sys
      default: "user",
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:modelValue", "change", "selectedChange"],
  setup(props, ctx) {
    const api = createAccessApi(props.from);

    const target = ref({});
    const selectedId = ref();
    async function refreshTarget(value) {
      selectedId.value = value;
      if (value > 0) {
        target.value = await api.GetSimpleInfo(value);
      }
    }

    function clear() {
      if (props.disabled) {
        return;
      }
      emitValue(null);
    }

    const userStore = useUserStore();
    const projectStore = useProjectStore();

    async function emitValue(value) {
      const userId = userStore.userInfo.id;
      const isEnterprice = projectStore.isEnterprise;
      if (pipeline.value) {
        if (isEnterprice) {
          const projectId = projectStore.currentProjectId;
          if (pipeline.value.projectId !== projectId) {
            message.error(`对不起，您不能修改其他项目流水线的授权`);
            return;
          }
        } else {
          if (pipeline?.value && pipeline.value.userId !== userId) {
            message.error(`对不起，您不能修改他人流水线的授权`);
            return;
          }
        }
      }

      if (value == null) {
        selectedId.value = "";
        target.value = null;
      } else {
        selectedId.value = value;
        await refreshTarget(selectedId.value);
      }
      ctx.emit("change", selectedId.value);
      ctx.emit("update:modelValue", selectedId.value);
      ctx.emit("selectedChange", target.value);
    }

    watch(
      () => {
        return props.modelValue;
      },
      async value => {
        selectedId.value = null;
        target.value = null;
        if (value == null) {
          return;
        }
        await refreshTarget(value);
      },
      {
        immediate: true,
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
      async value => {
        await refreshProviderDefine(value);
      },
      {
        immediate: true,
      }
    );

    //当不在pipeline中编辑时，可能为空
    const pipeline = inject("pipeline", null);

    const chooseForm = reactive({
      show: false,
      open() {
        chooseForm.show = true;
      },
      ok: () => {
        console.log("choose ok:", selectedId.value);
        emitValue(selectedId.value);
        chooseForm.show = false;
      },
    });

    return {
      clear,
      target,
      selectedId,
      providerDefine,
      chooseForm,
    };
  },
});
</script>
<style lang="less">
.access-selector {
}
</style>
