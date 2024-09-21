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
  const map = {
    isPlus: {
      button: {
        name: "专业版已开通",
        title: "到期时间：" + expireTime.value
      },
      icon: {
        name: "",
        title: "专业版已开通"
      },
      nav: {
        name: "专业版",
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
    return `专业版已过期${days}天`;
  }
  return "";
});

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
  modal.confirm({
    title: isPlus ? "续期专业版" : "激活专业版",
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
              <li>可加VIP群，需求优先实现</li>
              <li>证书流水线数量无限制（免费版限制10条）</li>
              <li>免配置发邮件功能</li>
              <li>FTP上传、cdnfly、宝塔、易盾等部署插件</li>
              <li>更多特权敬请期待</li>
            </ul>
          </div>
          <div>
            <h3 class="block-header">{isPlus ? "续期" : "立刻激活"}</h3>
            <div>{isPlus ? "当前专业版已激活，到期时间" + dayjs(userStore.plusInfo.expireTime).format("YYYY-MM-DD") : ""}</div>
            <div class="mt-10">
              <div class="flex-o w-100">
                <span>站点ID：</span>
                <fs-copyable class="flex-1" v-model={computedSiteId.value}></fs-copyable>
              </div>
              <div class="mt-10">注意保存好数据库，暂不支持换绑（默认数据库路径/data/certd/db.sqlite）</div>
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
</style>
