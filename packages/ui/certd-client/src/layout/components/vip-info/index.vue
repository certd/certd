<template>
  <div class="layout-vip" :class="{ 'layout-plus': userStore.plusInfo?.isPlus }">
    <contextHolder />
    <fs-icon icon="mingcute:vip-1-line"></fs-icon>
    <div class="text">
      <span v-if="userStore.plusInfo?.isPlus">
        <a-tooltip>
          <template #title> 到期时间：{{ expireTime }} </template>
          <span>专业版</span>
        </a-tooltip>
      </span>
      <span v-else @click="openUpgrade"> 当前免费版 </span>
    </div>
  </div>
</template>
<script lang="tsx" setup>
import { ref, reactive } from "vue";
import { useUserStore } from "/@/store/modules/user";
import dayjs from "dayjs";
import { message, Modal } from "ant-design-vue";
import * as api from "./api";

const userStore = useUserStore();
const expireTime = ref("");
if (userStore.plusInfo?.isPlus) {
  expireTime.value = dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD");
}

const formState = reactive({
  code: ""
});

async function doActive() {
  if (!formState.code) {
    message.error("请输入激活码");
    throw new Error("请输入激活码");
  }
  const res = await api.doActive(formState);
  if (res) {
    await userStore.reInit();
    Modal.success({
      title: "激活成功",
      content: `您已成功激活专业版,有效期至：${dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD")}`
    });
  }
}
const [modal, contextHolder] = Modal.useModal();
function openUpgrade() {
  const placeholder = "请输入激活码";
  modal.confirm({
    title: "升级专业版",
    async onOk() {
      await doActive();
    },
    content: () => {
      return (
        <div class="mt-10 mb-10">
          <a-input v-model:value={formState.code} placeholder={placeholder} />
          <div class="mt-10">
            没有激活码？
            <a href="https://afdian.com/a/greper" target="_blank">
              爱发电赞助获取
            </a>
          </div>
        </div>
      );
    }
  });
}
</script>

<style lang="less">
.layout-vip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  &.isPlus {
    color: #c5913f;
  }

  .text {
    margin-left: 5px;
  }
}
</style>
