<template>
  <div class="mt-10 vip-active-modal">
    <div v-if="todayOrderCount.enabled" class="order-count hidden md:flex">
      <div v-for="(stage, index) in todayOrderCount.stages" :key="index" class="status-item" :class="{ 'status-show': TodayVipOrderCountRef.current === index }">
        <div class="background">
          <img :src="stage.bg" alt="" />
        </div>
        <div class="flex flex-col order-count-text weight-bold">
          <div class="count-text ml-4 flex items-center">
            <fs-icon icon="noto:fire" class="fs-20 mr-2"></fs-icon>
            <template v-if="stage.vipTotal > 0">
              <span> 已有 </span>
              <span class="count-number color-red font-bold text-2xl ml-1 mr-1"> {{ stage.vipTotal }} </span> 位小伙伴赞助，
              <span>
                {{ stage.title }}
              </span>
            </template>
            <template v-else>
              <span> 今日赞助 </span>
              <span class="count-number color-red font-bold text-2xl ml-1 mr-1"> {{ stage.orderCount }} </span> 人，
              <span>
                {{ stage.title }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>
    <div v-if="productInfo.notice" class="mt-10">
      <a-alert type="error" :message="productInfo.notice"></a-alert>
    </div>
    <div class="vip-type-vs mt-10">
      <a-row :gutter="20">
        <div v-for="(item, key) in vipTypeDefine" :key="key" class="w-full md:w-1/3 mb-4 p-5">
          <div :class="`vip-block  ${key === settingStore.plusInfo.vipType ? 'current' : ''}`">
            <h3 class="block-header">
              <span class="flex-o">{{ item.title }}</span>
              <span v-if="item.trial" class="trial">
                <a-tooltip :title="item.trial.message">
                  <a @click="item.trial.click">{{ item.trial.title }}</a>
                </a-tooltip>
              </span>
            </h3>
            <div style="color: green" class="flex-o">
              <fs-icon :icon="item.icon" class="fs-16 flex-o" />
              {{ item.desc }}
            </div>
            <ul class="flex-1 privilege">
              <li v-for="p in item.privilege" :key="p" class="flex-baseline">
                <fs-icon class="color-green" icon="ion:checkmark-sharp" />
                {{ p }}
              </li>
            </ul>
            <div class="footer flex-between flex-vc">
              <div class="price-show">
                <span v-if="item.priceText" class="flex">
                  <span class="-text">{{ item.priceText }}</span>
                  <a-tooltip class="ml-5" :title="item.discountText">
                    <fs-icon class="pointer color-red" icon="ic:outline-discount"></fs-icon>
                  </a-tooltip>
                </span>
                <span v-else>
                  <span class="price-text">{{ t("vip.freee") }}</span>
                </span>
              </div>
              <div class="get-show">
                <template v-if="item.type === 'plus'">
                  <a-tooltip :title="t('vip.afdian_support_vip')">
                    <a-button size="small" type="primary" @click="goBuyPlusPage">
                      {{ t("vip.get_after_support") }}
                    </a-button>
                  </a-tooltip>
                </template>
                <template v-else-if="item.type === 'comm'">
                  <a-button size="small" type="primary" @click="goBuyCommPage">
                    {{ t("vip.buy") }}
                  </a-button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </a-row>
    </div>
    <div>
      <a href="https://certd.docmirror.cn/guide/donate/#相关问题" target="_blank">
        {{ t("vip.question") }}
      </a>
    </div>
    <div class="mt-10">
      <div class="w-100 flex-col md:flex-row">
        <span>{{ t("vip.site_id") }}：</span>
        <fs-copyable v-model="computedSiteId" class="mr-2 inline-flex"></fs-copyable>
        <a @click="goBindAccount">{{ t("vip.not_effective") }}</a>
      </div>
    </div>
    <div v-if="isPlus" class="mt-10 flex flex-col md:flex-row">
      <span class="mr-2"> {{ t("vip.current") }} {{ vipLabel }} {{ t("vip.activated_expire_time") }} {{ settingStore.expiresText }} </span>
      <a href="https://app.handfree.work/subject/#/page/detail/1" target="_blank">
        {{ t("vip.learn_more") }}
      </a>
    </div>
    <div class="mt-10">
      <span class="mr-2">{{ t("vip.have_activation_code") }}</span>
      <span>
        <a @click="showManualActivation">{{ t("vip.manual_activation") }}</a>
      </span>
    </div>
    <div v-if="manualActiveFlag" class="mt-10">
      <div class="mt-10">
        <a-input-search v-model:value="formState.code" class="w-2/6" :placeholder="placeholder" :enter-button="t('vip.activate')" @search="doActive"></a-input-search>
      </div>
      <div class="mt-10">
        {{ t("vip.activation_code_one_use") }}
        <a @click="goAccount">{{ t("vip.bind_account") }}</a
        >，{{ t("vip.transfer_vip") }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { message, Modal } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, nextTick, onMounted, onUnmounted, reactive, Ref, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import * as api from "./api";
import { useSettingStore } from "/@/store/settings";

const { t } = useI18n();
const router = useRouter();
const settingStore = useSettingStore();

const props = defineProps<{
  placeholder: string;
  isPlus: boolean;
  productInfo: any;
  goBuyPlusPage: () => void;
  goBuyCommPage: () => void;
  openStarModal: (vipType: string) => void;
  modalRef: any;
}>();

const formState = reactive({
  code: "",
  inviteCode: "",
});

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

const vipLabel = computed(() => settingStore.vipLabel);
const computedSiteId = computed(() => settingStore.installInfo?.siteId);

const manualActiveFlag = ref(false);

function showManualActivation() {
  manualActiveFlag.value = true;
}

function goAccount() {
  props.modalRef?.destroy();
  router.push("/sys/account");
}

function goBindAccount() {
  props.modalRef?.destroy();
  router.push({
    path: "/sys/account",
  });
}

const vipTypeDefine: any = {
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
        props.openStarModal("plus");
      },
    },
    icon: "stash:thumb-up",
    priceText: props.productInfo.plus.priceText || `¥${props.productInfo.plus.price}/${t("vip.years")}`,
    discountText: props.productInfo.plus.discountText || `¥${props.productInfo.plus.price3}/3${t("vip.years")}`,
    tooltip: props.productInfo.plus.tooltip,
  },
  comm: {
    title: t("vip.business_edition"),
    desc: t("vip.commercial_license"),
    type: "comm",
    icon: "vaadin:handshake",
    privilege: [t("vip.all_pro_privileges"), t("vip.allow_commercial_use_modify_logo_title"), t("vip.data_statistics"), t("vip.plugin_management"), t("vip.unlimited_multi_users"), t("vip.support_user_payment")],
    priceText: props.productInfo.comm.priceText || `¥${props.productInfo.comm.price}/${t("vip.years")}`,
    discountText: props.productInfo.comm.discountText || `¥${props.productInfo.comm.price3}/3${t("vip.years")}`,
    tooltip: props.productInfo.comm.tooltip,
    trial: {
      title: t("vip.click_to_get_7_day_trial"),
      click: () => {
        props.openStarModal("comm");
      },
    },
  },
};

const TodayVipOrderCountRef: Ref = ref({ enabled: false, current: 0, stages: [] });

async function getTodayVipOrderCount() {
  const res = await api.getTodayVipOrderCount();
  if (res) {
    TodayVipOrderCountRef.value = res;
    TodayVipOrderCountRef.value.current = 0;
  }
}

const todayOrderCount = computed(() => {
  const countInfo = TodayVipOrderCountRef.value;
  const enabled = countInfo?.enabled || false;
  const orderCount = countInfo?.orderCount || 0;
  for (const stage of countInfo?.stages) {
    stage.orderCount = stage.countGe || 0;
  }
  const lastStage = countInfo?.stages?.[countInfo?.stages?.length - 1] || {};
  lastStage.orderCount = orderCount;

  const stages: any = [];
  stages.push({
    title: countInfo.title,
    vipTotal: countInfo?.vipTotal || 0,
    orderCount: orderCount,
    bg: lastStage.bg,
  });
  if (lastStage.orderCount > 0) {
    stages.push(lastStage);
  }
  return {
    enabled: enabled,
    stages: stages,
  };
});

async function scrollOrderCount() {
  const stages = todayOrderCount.value.stages;
  if (stages.length === 0) {
    return;
  }
  let index = 0;
  const doScroll = () => {
    TodayVipOrderCountRef.value.current = index;
    index++;
    if (index >= stages.length) {
      index = 0;
    }
  };
  doScroll();
  scrollOrderCountIntervalRef.value = setInterval(doScroll, 7000);
}

const scrollOrderCountIntervalRef: Ref = ref(null);
onMounted(async () => {
  await getTodayVipOrderCount();
  await nextTick();
  await scrollOrderCount();
});

onUnmounted(() => {
  clearInterval(scrollOrderCountIntervalRef.value);
});
</script>

<style lang="less">
.vip-active-modal {
  .order-count {
    height: 80px;
    position: relative;
    border: 1px solid #fee2c5;
    border-radius: 5px;

    .background {
      border: 0px;
      border-radius: 5px;
      height: 100%;
      width: 100%;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 0;
      display: flex;
      justify-content: flex-end;
      overflow: hidden;

      img {
        height: 100%;
        object-fit: cover;
      }
    }

    .order-count-text {
      position: absolute;
      width: 100%;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      /* 左至右渐变*/
      background: linear-gradient(to right, rgba(255, 217, 167, 0.5), rgba(255, 255, 255, 0));

      .count-text {
        font-size: 16px;
        font-weight: 600;
        color: #ff6600;
        display: flex;

        .count-number {
          margin-bottom: 5px;
        }
      }
    }

    .status-item {
      opacity: 0;
      transition: all 0.7s ease-in-out;
    }

    .status-show {
      opacity: 1;
    }
  }

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
