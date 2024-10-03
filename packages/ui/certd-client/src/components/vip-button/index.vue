<template>
  <div class="layout-vip isPlus" @click="openUpgrade">
    <contextHolder />
    <fs-icon icon="mingcute:vip-1-line" :title="text.title" />

    <div v-if="mode !== 'icon'" class="text">
      <a-tooltip>
        <template #title> {{ text.title }}</template>
        <span>{{ text.name }}</span>
      </a-tooltip>
    </div>
  </div>
</template>
<script lang="tsx" setup>
import { ref, reactive, computed } from "vue";
import { useUserStore } from "/src/store/modules/user";
import dayjs from "dayjs";
import { message, Modal } from "ant-design-vue";
import * as api from "./api";
import { useSettingStore } from "/@/store/modules/settings";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    mode?: "button" | "nav" | "icon";
  }>(),
  {
    mode: "button"
  }
);
type Text = {
  name: string;
  title?: string;
};
const text = computed<Text>(() => {
  const vipLabel = userStore.vipLabel;
  const map = {
    isPlus: {
      button: {
        name: `${vipLabel}已开通`,
        title: "到期时间：" + expireTime.value
      },
      icon: {
        name: "",
        title: `${vipLabel}已开通`
      },
      nav: {
        name: `${vipLabel}`,
        title: "到期时间：" + expireTime.value
      }
    },
    free: {
      button: {
        name: "此为专业版功能",
        title: "升级专业版，享受更多VIP特权"
      },
      icon: {
        name: "",
        title: "此为专业版功能"
      },
      nav: {
        name: "免费版",
        title: "升级专业版，享受更多VIP特权"
      }
    }
  };
  if (userStore.isPlus) {
    return map.isPlus[props.mode];
  } else {
    return map.free[props.mode];
  }
});

const userStore = useUserStore();
const expireTime = computed(() => {
  if (userStore.isPlus) {
    return dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD");
  }
  return "";
});

const expiredDays = computed(() => {
  if (userStore.plusInfo?.isPlus && !userStore.isPlus) {
    //已过期多少天
    const days = dayjs().diff(dayjs(userStore.plusInfo.expireTime), "day");
    return `${userStore.vipLabel}已过期${days}天`;
  }
  return "";
});

const formState = reactive({
  code: ""
});

const router = useRouter();
async function doActive() {
  if (!formState.code) {
    message.error("请输入激活码");
    throw new Error("请输入激活码");
  }
  const res = await api.doActive(formState);
  if (res) {
    await userStore.reInit();
    const vipLabel = userStore.vipLabel;
    Modal.success({
      title: "激活成功",
      content: `您已成功激活${vipLabel},有效期至：${dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD")}`,
      onOk() {
        if (!(settingStore.installInfo.bindUserId > 0)) {
          //未绑定账号
          Modal.confirm({
            title: "是否绑定袖手账号",
            content: "绑定账号后，可以避免License丢失，强烈建议绑定",
            onOk() {
              router.push("/sys/account");
            }
          });
        }
      }
    });
  }
}

const settingStore = useSettingStore();
const computedSiteId = computed(() => settingStore.installInfo?.siteId);
const [modal, contextHolder] = Modal.useModal();

function openUpgrade() {
  if (!userStore.isAdmin) {
    message.info("仅限管理员操作");
    return;
  }
  const placeholder = "请输入激活码";
  const isPlus = userStore.isPlus;
  let title = "激活专业版/商业版";
  if (userStore.isComm) {
    title = "续期商业版";
  } else if (userStore.isPlus) {
    title = "续期专业版/升级商业版";
  }

  modal.confirm({
    title,
    async onOk() {
      return await doActive();
    },
    maskClosable: true,
    okText: "激活",
    width: 900,
    content: () => {
      const vipLabel = userStore.vipLabel;
      return (
        <div class="mt-10 mb-10 vip-active-modal">
          <div class="vip-type-vs">
            <a-row gutter={20}>
              <a-col span={8}>
                <h3 class="block-header">免费版</h3>
                <ul>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>证书申请功能无限制
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    证书流水线数量10条
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    常用的部署插件
                  </li>
                </ul>
              </a-col>
              <a-col span={8}>
                <h3 class="block-header">专业版</h3>
                <ul>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    可加VIP群，需求优先实现
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    证书流水线数量无限制
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    免配置发邮件功能
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    支持宝塔、易盾、群晖、cdnfly、1Panel等部署插件
                  </li>
                </ul>
              </a-col>
              <a-col span={8}>
                <h3 class="block-header">商业版</h3>
                <ul>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    拥有专业版所有特权
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    修改logo、标题
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    多用户无限制
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    支持用户支付
                  </li>
                  <li>
                    <fs-icon class="color-green" icon="ion:checkmark-sharp"></fs-icon>
                    允许商用
                  </li>
                </ul>
              </a-col>
            </a-row>
          </div>
          <div>
            <h3 class="block-header">{isPlus ? "续期" : "立刻激活"}</h3>
            <div>{isPlus ? `当前${vipLabel}已激活，到期时间` + dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD") : ""}</div>
            <div class="mt-10">
              <div class="flex-o w-100">
                <span>站点ID：</span>
                <fs-copyable class="flex-1" v-model={computedSiteId.value}></fs-copyable>
              </div>
              <a-input class="mt-10" v-model:value={formState.code} placeholder={placeholder} />
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

.vip-active-modal {
  ul {
    list-style-type: unset;
    margin-left: 0px;
    padding: 0;
  }
  .vip-type-vs {
    .fs-icon {
      margin-right: 5px;
      color: green;
    }
  }
}
</style>
