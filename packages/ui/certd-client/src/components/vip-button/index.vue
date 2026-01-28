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
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import * as api from "./api";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { env } from "/@/utils/util.env";
import { mitter } from "/@/utils/util.mitt";
const { t } = useI18n();

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
    //已过期多少天
    const days = dayjs().diff(dayjs(settingStore.plusInfo.expireTime), "day");
    return `${settingStore.vipLabel}已过期${days}天`;
  }
  return "";
});

const formState = reactive({
  code: "",
  inviteCode: "",
});

const router = useRouter();
async function doActive() {
  if (!formState.code) {
    message.error(t("vip.enterCode"));
    throw new Error(t("vip.enterCode"));
  }
  const res = await api.doActive(formState);
  if (res) {
    await settingStore.init();
    const vipLabel = settingStore.vipLabel;
    Modal.success({
      title: t("vip.successTitle"),
      content: t("vip.successContent", {
        vipLabel,
        expireDate: dayjs(settingStore.plusInfo.expireTime).format("YYYY-MM-DD"),
      }),
      onOk() {
        if (!(settingStore.installInfo.bindUserId > 0)) {
          Modal.confirm({
            title: t("vip.bindAccountTitle"),
            content: t("vip.bindAccountContent"),
            onOk() {
              router.push("/sys/account");
            },
          });
        }
      },
    });
  }
}

const computedSiteId = computed(() => settingStore.installInfo?.siteId);
const [modal, contextHolder] = Modal.useModal();
const userStore = useUserStore();

function goAccount() {
  Modal.destroyAll();
  router.push("/sys/account");
}

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
  const vipTypeDefine = {
    free: {
      title: t("vip.basic_edition"),
      desc: t("vip.community_free_version"),
      type: "free",
      icon: "lucide:package-open",
      privilege: [t("vip.unlimited_certificate_application"), t("vip.unlimited_domain_count"), t("vip.unlimited_certificate_pipelines"), t("vip.common_deployment_plugins"), t("vip.email_webhook_notifications")],
    },
    plus: {
      title: t("vip.professional_edition"),
      desc: t("vip.open_source_support"),
      type: "plus",
      privilege: [t("vip.vip_group_priority"), t("vip.unlimited_site_certificate_monitoring"), t("vip.more_notification_methods"), t("vip.plugins_fully_open")],
      trial: {
        title: t("vip.click_to_get_7_day_trial"),
        click: () => {
          openStarModal("plus");
        },
      },
      icon: "stash:thumb-up",
      priceText: productInfo.plus.priceText || `¥${productInfo.plus.price}/${t("vip.years")}`,
      discountText: productInfo.plus.discountText || `¥${productInfo.plus.price3}/3${t("vip.years")}`,
      tooltip: productInfo.plus.tooltip,
      get() {
        return (
          <a-tooltip title={t("vip.afdian_support_vip")}>
            <a-button size="small" type="primary" onClick={goBuyPlusPage}>
              {t("vip.get_after_support")}
            </a-button>
          </a-tooltip>
        );
      },
    },
    comm: {
      title: t("vip.business_edition"),
      desc: t("vip.commercial_license"),
      type: "comm",
      icon: "vaadin:handshake",
      privilege: [t("vip.all_pro_privileges"), t("vip.allow_commercial_use_modify_logo_title"), t("vip.data_statistics"), t("vip.plugin_management"), t("vip.unlimited_multi_users"), t("vip.support_user_payment")],
      priceText: productInfo.comm.priceText || `¥${productInfo.comm.price}/${t("vip.years")}`,
      discountText: productInfo.comm.discountText || `¥${productInfo.comm.price3}/3${t("vip.years")}`,
      tooltip: productInfo.comm.tooltip,
      trial: {
        title: t("vip.click_to_get_7_day_trial"),
        click: () => {
          openStarModal("comm");
        },
      },
      get() {
        return (
          <a-button size="small" type="primary" onClick={goBuyCommPage}>
            {t("vip.buy")}
          </a-button>
        );
      },
    },
  };

  const manualActiveFlag = ref();
  function showManualActivation() {
    manualActiveFlag.value = true;
  }

  function goBindAccount() {
    modalRef?.destroy();
    router.push({
      path: "/sys/account",
    });
  }
  const modalRef = modal.success({
    title,
    class: "vip-modal",
    maskClosable: true,
    okText: t("vip.close"),
    width: 1100,
    content: () => {
      let manualActiveBlock: any = "";
      if (manualActiveFlag.value) {
        manualActiveBlock = (
          <div>
            <div class="mt-10">
              <a-input-search class="w-2/6" v-model:value={formState.code} placeholder={placeholder} enter-button={t("vip.activate")} onSearch={doActive}></a-input-search>
            </div>
            <div class="mt-10">
              {t("vip.activation_code_one_use")}
              <a onClick={goAccount}>{t("vip.bind_account")}</a>，{t("vip.transfer_vip")}
            </div>
          </div>
        );
      }
      const vipLabel = settingStore.vipLabel;
      let plusInfo: any = "";
      if (isPlus) {
        plusInfo = (
          <div class="mt-10 flex flex-col md:flex-row ">
            <span class="mr-2">
              {t("vip.current")} {vipLabel} {t("vip.activated_expire_time")} {settingStore.expiresText}
            </span>
            <a href="https://app.handfree.work/subject/#/page/detail/1" target="_blank">
              {t("vip.learn_more")}
            </a>
          </div>
        );
      }

      const slots = [];
      for (const key in vipTypeDefine) {
        // @ts-ignore
        const item = vipTypeDefine[key];
        const vipBlockClass = `vip-block  ${key === settingStore.plusInfo.vipType ? "current" : ""}`;
        slots.push(
          <div class="w-full md:w-1/3 mb-4 p-5">
            <div class={vipBlockClass}>
              <h3 class="block-header ">
                <span class="flex-o">{item.title}</span>
                {item.trial && (
                  <span class="trial">
                    <a-tooltip title={item.trial.message}>
                      <a onClick={item.trial.click}>{item.trial.title}</a>
                    </a-tooltip>
                  </span>
                )}
              </h3>
              <div style="color:green" class="flex-o">
                <fs-icon icon={item.icon} class="fs-16 flex-o" />
                {item.desc}
              </div>
              <ul class="flex-1 privilege">
                {item.privilege.map((p: string) => (
                  <li class="flex-baseline">
                    <fs-icon class="color-green" icon="ion:checkmark-sharp" />
                    {p}
                  </li>
                ))}
              </ul>
              <div class="footer flex-between flex-vc">
                <div class="price-show">
                  {item.priceText && (
                    <span class="flex">
                      <span class="-text">{item.priceText}</span>
                      <a-tooltip class="ml-5" title={item.discountText}>
                        <fs-icon class="pointer color-red" icon="ic:outline-discount"></fs-icon>
                      </a-tooltip>
                    </span>
                  )}
                  {!item.priceText && (
                    <span>
                      <span class="price-text">{t("vip.freee")}</span>
                    </span>
                  )}
                </div>
                <div class="get-show">{item.get && <div>{item.get()}</div>}</div>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div class="mt-10 mb-10 vip-active-modal">
          {productInfo.notice && (
            <div class="mb-10">
              <a-alert type="error" message={productInfo.notice}></a-alert>
            </div>
          )}
          <div class="vip-type-vs">
            <a-row gutter={20}>{slots}</a-row>
          </div>
          <div>
            <a href="https://certd.docmirror.cn/guide/donate/#相关问题" target="_blank">
              {t("vip.question")}
            </a>
          </div>
          <div class="mt-10">
            <div class=" w-100 flex-col md:flex-row ">
              <span>{t("vip.site_id")}：</span>
              <fs-copyable v-model={computedSiteId.value} class="mr-2"></fs-copyable>
              <a onClick={goBindAccount}>{t("vip.not_effective")}</a>
            </div>
          </div>
          {plusInfo}
          <div class="mt-10 ">
            <span class="mr-2">{t("vip.have_activation_code")}</span>
            <span>
              <a onClick={showManualActivation}>{t("vip.manual_activation")}</a>
            </span>
          </div>
          <div class="mt-10">{manualActiveBlock}</div>
        </div>
      );
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

.vip-active-modal {
  .vip-block {
    display: flex;
    flex-direction: column;
    padding: 10px;
    border: 1px solid #eee;
    border-radius: 5px;
    height: 275px;
    line-height: 24px;

    .privilege {
      margin-top: 5px;
    }

    //background-color: rgba(250, 237, 167, 0.79);
    &.current {
      border-color: green;
    }

    .block-header {
      padding: 0px;
      display: flex;
      justify-content: space-between;

      .trial {
        font-size: 12px;
        font-wight: 400;
      }
    }

    .footer {
      padding-top: 5px;
      margin-top: 0px;
      border-top: 1px solid #eee;

      .price-text {
        font-size: 18px;
        color: red;
      }
    }
  }

  ul {
    list-style-type: unset;
    margin-left: 0px;
    padding: 0;
  }

  .color-green {
    color: green;
  }

  .vip-type-vs {
    .privilege {
      .fs-icon {
        color: green;
      }
    }

    .fs-icon {
      margin-right: 5px;
    }
  }
}
</style>
