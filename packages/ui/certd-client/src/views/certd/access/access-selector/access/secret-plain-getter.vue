<template>
  <a-button class="cd-secret-plain-getter ml-5" @click="showPlain">
    <fs-icon class="pointer" :icon="computedIcon" />
  </a-button>
</template>
<script lang="tsx" setup>
import { computed, inject, ref } from "vue";
import { useFormDialog } from "/@/use/use-dialog";
defineOptions({
  name: "SecretPlainGetter",
});

const props = defineProps<{
  modelValue?: string;
  accessId?: number;
  inputKey: string;
}>();

const emit = defineEmits(["update:modelValue"]);
const showRef = ref(false);
const computedIcon = computed(() => {
  return showRef.value ? "ion:eye-outline" : "ion:eye-off-outline";
});
const accessApi: any = inject("accessApi");
const { openFormDialog } = useFormDialog();
async function showPlain() {
  if (!accessApi.HasSecretAccess()) {
    await openFormDialog({
      title: "验证 2FA",
      wrapper: { width: 420 },
      initialForm: { verifyCode: "" },
      columns: {
        verifyCode: {
          title: "动态验证码",
          type: "text",
          form: {
            component: { placeholder: "请输入身份验证器中的 6 位验证码" },
            rules: [{ required: true, message: "请输入动态验证码" }],
            col: { span: 24 },
            helper: {
              render: () => {
                return (
                  <div>
                    必须先开启
                    <a target="_blank" href="/#/cert/mine/security">
                      2FA验证
                    </a>
                  </div>
                );
              },
            },
          },
        },
      },
      async onSubmit(form: any) {
        await accessApi.VerifySecretAccess(form.verifyCode);
      },
    });
  }
  if (props.accessId) {
    const plain = await accessApi.GetSecretPlain(props.accessId, props.inputKey);
    emit("update:modelValue", plain);
    showRef.value = true;
  }
}
</script>
<style lang="less"></style>
