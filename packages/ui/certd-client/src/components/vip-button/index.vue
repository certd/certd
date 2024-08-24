<template>
  <div class="layout-vip" :class="{ isPlus: userStore.plusInfo?.isPlus }">
    <contextHolder />
    <fs-icon icon="mingcute:vip-1-line"></fs-icon>
    <div class="text">
      <span v-if="userStore.plusInfo?.isPlus">
        <a-tooltip>
          <template #title> 到期时间：{{ expireTime }} </template>
          <span @click="openUpgrade">{{ texts.plus }}</span>
        </a-tooltip>
      </span>
      <span v-else @click="openUpgrade"> {{ texts.free }} </span>
    </div>
  </div>
</template>
<script lang="tsx" setup>
import { ref, reactive, computed } from "vue";
import { useUserStore } from "/src/store/modules/user";
import dayjs from "dayjs";
import { message, Modal } from "ant-design-vue";
import * as api from "./api";

const props = defineProps<{
  mode: "button" | "nav";
}>();
type Texts = {
  plus: string;
  free: string;
};
const texts = computed<Texts>(() => {
  if (props.mode === "button") {
    return {
      plus: "已开通",
      free: "专业版功能"
    };
  } else {
    return {
      plus: "专业版",
      free: "免费版，立即升级"
    };
  }
});

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
    title: "升级/续期专业版",
    async onOk() {
      return await doActive();
    },
    okText: "激活",
    width: 500,
    content: () => {
      return (
        <div class="mt-10 mb-10">
          <div>
            <h3 class="block-header">专业版特权</h3>
            <ul>
              <li>证书流水线数量无限制</li>
              <li>可加VIP群，需求优先实现</li>
              <li>更多特权敬请期待</li>
            </ul>
          </div>
          <div>
            <h3 class="block-header">立刻激活/续期</h3>
            <div class="mt-10">
              <a-input v-model:value={formState.code} placeholder={placeholder} />
            </div>

            <div class="mt-10">
              没有激活码？
              <a href="https://afdian.com/a/greper" target="_blank">
                爱发电赞助“VIP会员”后获取
              </a>
            </div>
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
  cursor: pointer;
  &.isPlus {
    color: #c5913f;
  }

  .text {
    margin-left: 5px;
  }
}
</style>
