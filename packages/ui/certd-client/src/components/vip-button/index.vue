<template>
  <div v-if="!settingStore.isComm || userStore.isAdmin" class="layout-vip isPlus" :class="{ isForever: settingStore.isForever }" @click="openUpgrade">
    <contextHolder />
    <fs-icon icon="mingcute:vip-1-line" :title="text.title" />

    <div v-if="mode !== 'icon'" class="text hidden md:block ml-0.5">
      <a-tooltip>
        <template #title> {{ text.title }}</template>
        <span class="">{{ text.name }}</span>
      </a-tooltip>
    </div>
  </div>
</template>
<script lang="tsx" setup>
import { message, Modal } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import * as api from "./api";
import { useSettingStore } from "/src/store/settings/index";
import { useUserStore } from "/@/store/user";
import { env } from "/@/utils/util.env";
import { mitter } from "/@/utils/util.mitt";
import VipModalContent from "./vip-modal-content.vue";
const { t } = useI18n();

defineOptions({
  name: "VipButton",
});
const settingStore = useSettingStore();
const props = withDefaults(
  defineProps<{
    mode?: "comm" | "button" | "nav" | "icon";
  }>(),
  {
    mode: "button",
  }
);
type Text = {
  name: string;
  title?: string;
};
const text = computed<Text>(() => {
  const vipLabel = settingStore.vipLabel;
  const map = {
    isComm: {
      comm: {
        name: t("vip.comm.name", { vipLabel }),
        title: t("vip.comm.title", { expire: expireTime.value }),
      },
      button: {
        name: t("vip.comm.name", { vipLabel }),
        title: t("vip.comm.title", { expire: expireTime.value }),
      },
      icon: {
        name: "",
        title: t("vip.comm.name", { vipLabel }),
      },
      nav: {
        name: t("vip.comm.nav", { vipLabel }),
        title: t("vip.comm.title", { expire: expireTime.value }),
      },
    },
    isPlus: {
      comm: {
        name: t("vip.plus.name"),
        title: t("vip.plus.title"),
      },
      button: {
        name: t("vip.comm.name", { vipLabel }),
        title: t("vip.comm.title", { expire: expireTime.value }),
      },
      icon: {
        name: "",
        title: t("vip.comm.name", { vipLabel }),
      },
      nav: {
        name: t("vip.comm.nav", { vipLabel }),
        title: t("vip.comm.title", { expire: expireTime.value }),
      },
    },
    free: {
      comm: {
        name: t("vip.free.comm.name"),
        title: t("vip.free.comm.title"),
      },
      button: {
        name: t("vip.free.button.name"),
        title: t("vip.free.button.title"),
      },
      icon: {
        name: "",
        title: t("vip.free.button.name"),
      },
      nav: {
        name: t("vip.free.nav.name"),
        title: t("vip.free.nav.title"),
      },
    },
  };
  if (settingStore.isComm) {
    return map.isComm[props.mode];
  } else if (settingStore.isPlus) {
    return map.isPlus[props.mode];
  } else {
    return map.free[props.mode];
  }
});

const expireTime = computed(() => {
  if (settingStore.isPlus) {
    return settingStore.expiresText;
  }
  return "";
});

const expiredDays = computed(() => {
  if (settingStore.plusInfo?.isPlus && !settingStore.isPlus) {
    const days = dayjs().diff(dayjs(settingStore.plusInfo.expireTime), "day");
    return `${settingStore.vipLabel}已过期${days}天`;
  }
  return "";
});

const router = useRouter();
const [modal, contextHolder] = Modal.useModal();
const userStore = useUserStore();

async function getVipTrial(vipType = "plus") {
  const res = await api.getVipTrial(vipType);
  message.success(t("vip.congratulations_vip_trial", { duration: res.duration }));
  await settingStore.init();
}

function openTrialModal(vipType = "plus") {
  Modal.destroyAll();

  modal.confirm({
    title: t("vip.trial_modal_title"),
    okText: t("vip.trial_modal_ok_text"),
    onOk() {
      getVipTrial(vipType);
    },
    width: 600,
    content: () => {
      return (
        <div class="flex-col mt-10 mb-10">
          <div>{t("vip.trial_modal_thanks")}</div>
          <div>{t("vip.trial_modal_click_confirm", { vipType })}</div>
        </div>
      );
    },
  });
}

function openStarModal(vipType: string) {
  if (settingStore.isPlus) {
    message.error(t("vip.already_vip"));
    return;
  }
  Modal.destroyAll();
  const goGithub = () => {
    window.open("https://github.com/certd/certd/");
  };

  modal.confirm({
    title: t("vip.get_7_day_pro_trial"),
    okText: t("vip.star_now"),
    onOk() {
      goGithub();
      openTrialModal(vipType);
    },
    width: 600,
    content: () => {
      return (
        <div class="flex mt-10 mb-10">
          <div>{t("vip.please_help_star")}</div>
          <img class="ml-5" src="https://img.shields.io/github/stars/certd/certd?logo=github" />
        </div>
      );
    },
  });
}

function openUpgrade() {
  if (!userStore.isAdmin) {
    message.info(t("vip.admin_only_operation"));
    return;
  }
  const placeholder = t("vip.enter_activation_code");
  const isPlus = settingStore.isPlus;
  let title = t("vip.activate_pro_business");
  if (settingStore.isComm) {
    title = t("vip.renew_business");
  } else if (settingStore.isPlus) {
    title = t("vip.renew_pro_upgrade_business");
  }

  // const goBuyUrl = "https://afdian.com/a/greper"
  const subjectId = settingStore.installInfo.siteId;
  const appKey = settingStore.installInfo.appKey;
  const location = window.location;
  const callbackUrl = encodeURIComponent(`${location.origin}${location.pathname}#/sys/account`);
  const goBuyUrl = `${env.VIP_PRODUCT_URL}?appKey=${appKey}&subjectId=${subjectId}&callback=${callbackUrl}`;
  const goBuyCommUrl = `${goBuyUrl}&vipType=comm`;
  const productInfo = settingStore.productInfo;

  function checkPerpetualPlus() {
    if (settingStore.isPerpetual) {
      Modal.warn({
        title: t("vip.already_perpetual_plus"),
        okText: t("vip.confirm"),
      });
      throw new Error(t("vip.already_perpetual_plus"));
    }
  }

  function goBuyPlusPage() {
    checkPerpetualPlus();
    if (settingStore.isComm) {
      Modal.warn({
        title: t("vip.already_comm"),
        okText: t("vip.confirm"),
      });
      return;
    }
    window.open(goBuyUrl);
  }

  function goBuyCommPage() {
    checkPerpetualPlus();
    if (settingStore.isPlus && !settingStore.isComm) {
      Modal.confirm({
        title: t("vip.already_plus"),
        okText: t("vip.confirm"),
        onOk() {
          window.open(goBuyCommUrl);
        },
      });
      return;
    }
    window.open(goBuyCommUrl);
  }
  const modalRef = modal.success({
    title,
    class: "vip-modal",
    maskClosable: true,
    okText: t("vip.close"),
    width: 1100,
    content: () => {
      return <VipModalContent placeholder={placeholder} isPlus={isPlus} productInfo={productInfo} goBuyPlusPage={goBuyPlusPage} goBuyCommPage={goBuyCommPage} openStarModal={openStarModal} modalRef={modalRef} />;
    },
  });
}
onMounted(() => {
  mitter.on("openVipModal", () => {
    if (props.mode === "nav" && !settingStore.isPlus) {
      openUpgrade();
    }
  });
});
</script>

<style lang="less">
.vip-modal {
  .ant-modal-confirm-content {
    margin-inline-start: 10px !important;
  }
}
.layout-vip {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &.isPlus {
    color: #c5913f;

    &.isForever {
      color: #ff2e83;
    }
  }

  .text {
  }
}
</style>
