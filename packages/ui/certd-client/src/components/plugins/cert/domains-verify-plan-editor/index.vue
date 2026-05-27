<template>
  <div class="domains-verify-plan-editor" :class="{ fullscreen }">
    <div class="fullscreen-modal" @click="fullscreenExit"></div>
    <div class="plan-wrapper">
      <div class="plan-box bg-white dark:bg-neutral-700">
        <div class="fullscreen-button pointer flex-center" @click="fullscreen = !fullscreen">
          <span v-if="!fullscreen" style="font-size: 10px" class="flex-center">
            {{ t("certd.verifyPlan.expandTip") }}
            <fs-icon icon="ion:arrow-forward-outline"></fs-icon>
          </span>
          <fs-icon :icon="fullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'"></fs-icon>
        </div>
        <table class="plan-table">
          <thead>
            <tr>
              <th style="min-width: 100px">{{ t("certd.verifyPlan.mainDomain") }}</th>
              <th>{{ t("certd.verifyPlan.challengeType") }}</th>
              <th>{{ t("certd.verifyPlan.challengePlan") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, key) of planRef" :key="key" class="row">
              <td>{{ item.domain }}</td>
              <td>
                <div class="type">
                  <a-select v-model:value="item.type" size="small" :options="challengeTypeOptions" @change="onPlanChanged"></a-select>
                </div>
              </td>
              <td style="padding: 0">
                <div class="plan">
                  <div v-if="item.type === 'dns'" class="plan-dns">
                    <div class="form-item">
                      <span class="label">{{ t("certd.verifyPlan.dnsType") }}:</span>
                      <span class="input">
                        <fs-dict-select
                          v-model:value="item.dnsProviderType"
                          size="small"
                          :dict="dnsProviderTypeDict"
                          :placeholder="t('certd.verifyPlan.dnsProvider')"
                          @change="onPlanChanged"
                          @selected-change="onDnsProviderChange(item, $event)"
                        ></fs-dict-select>
                      </span>
                    </div>
                    <a-divider type="vertical" />
                    <div class="form-item">
                      <span class="label">{{ t("certd.verifyPlan.dnsAccess") }}:</span>
                      <span class="input">
                        <access-selector
                          v-model="item.dnsProviderAccessId"
                          size="small"
                          :type="item.dnsProviderAccessType || item.dnsProviderType"
                          :placeholder="t('certd.verifyPlan.pleaseSelect')"
                          @change="onPlanChanged"
                        ></access-selector>
                      </span>
                    </div>
                  </div>
                  <div v-if="item.type === 'cname'" class="plan-cname">
                    <cname-verify-plan v-model="item.cnameVerifyPlan" @change="onPlanChanged" />
                  </div>
                  <div v-if="item.type === 'http'" class="plan-http">
                    <http-verify-plan v-model="item.httpVerifyPlan" @change="onPlanChanged" />
                    <div class="helper">{{ t("certd.verifyPlan.httpHelper") }}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="error">
          {{ errorMessageRef }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { dict, FsDictSelect } from "@fast-crud/fast-crud";
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import CnameVerifyPlan from "./cname-verify-plan.vue";
import HttpVerifyPlan from "./http-verify-plan.vue";
import { Form } from "ant-design-vue";
import { DomainsVerifyPlanInput } from "./type";
import { DomainGroupItem, ParseDomain } from "./api";

defineOptions({
  name: "DomainsVerifyPlanEditor",
});

const { t } = useI18n();

const challengeTypeOptions = ref<any[]>([
  {
    label: t("certd.verifyPlan.dnsChallenge"),
    value: "dns",
  },
  {
    label: t("certd.verifyPlan.cnameChallenge"),
    value: "cname",
  },
  {
    label: t("certd.verifyPlan.httpChallenge"),
    value: "http",
  },
]);

const props = defineProps<{
  modelValue?: DomainsVerifyPlanInput;
  domains?: string[];
  defaultType?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": any;
}>();

function onDnsProviderChange(item: any, option: any) {
  item.dnsProviderAccessType = option.accessType;
}

const fullscreen = ref(false);
function fullscreenExit() {
  if (fullscreen.value) {
    fullscreen.value = false;
  }
}
const planRef = ref<DomainsVerifyPlanInput>(props.modelValue || {});
const dnsProviderTypeDict = dict({
  url: "pi/dnsProvider/dnsProviderTypeDict",
});

const formItemContext = Form.useInjectFormItemContext();
function onPlanChanged() {
  console.log("plan changed", planRef.value);
  emit("update:modelValue", planRef.value);
  formItemContext.onFieldChange();
}

const errorMessageRef = ref<string>("");
function showError(error: string) {
  errorMessageRef.value = error;
}

type DomainGroup = Record<string, DomainGroupItem>;

async function onDomainsChanged(domains: string[]) {
  if (domains == null) {
    return;
  }

  const domainGroups: DomainGroup = {};
  for (let domain of domains) {
    const keyDomain = domain.replace("*.", "");
    const mainDomain = await ParseDomain(keyDomain);
    if (mainDomain == null) {
      continue;
    }
    let group = domainGroups[mainDomain];
    if (!group) {
      group = {
        domain: mainDomain,
        domains: [],
        keySubDomains: [],
      } as DomainGroupItem;
      domainGroups[mainDomain] = group;
    }
    group.domains.push(domain);
    group.keySubDomains.push(keyDomain);
  }

  for (const domain in domainGroups) {
    let planItem = planRef.value[domain];
    const domainGroupItem = domainGroups[domain];
    if (!planItem) {
      let type = props.defaultType || "cname";
      if (type === "dnses") {
        type = "dns";
      }
      planItem = {
        domain,
        //@ts-ignore
        type: type,
        //@ts-ignore
        cnameVerifyPlan: {},
        //@ts-ignore
        httpVerifyPlan: {},
      };
      planRef.value[domain] = planItem;
    }
    planItem.domains = domainGroupItem.domains;

    const cnameOrigin = planItem.cnameVerifyPlan;
    const httpOrigin = planItem.httpVerifyPlan;
    planItem.cnameVerifyPlan = {};
    planItem.httpVerifyPlan = {};
    const cnamePlan = planItem.cnameVerifyPlan;
    const httpPlan = planItem.httpVerifyPlan;
    for (const subDomain of domainGroupItem.keySubDomains) {
      if (!cnameOrigin[subDomain]) {
        //@ts-ignore
        planItem.cnameVerifyPlan[subDomain] = {
          id: 0,
        };
      } else {
        planItem.cnameVerifyPlan[subDomain] = cnameOrigin[subDomain];
      }

      if (!cnamePlan[subDomain]) {
        //@ts-ignore
        cnamePlan[subDomain] = {
          id: 0,
        };
      }

      if (!httpOrigin[subDomain]) {
        //@ts-ignore
        planItem.httpVerifyPlan[subDomain] = {
          domain: subDomain,
        };
      } else {
        planItem.httpVerifyPlan[subDomain] = httpOrigin[subDomain];
      }

      if (!httpPlan[subDomain]) {
        //@ts-ignore
        httpPlan[subDomain] = {
          domain: subDomain,
        };
      }
    }

    for (const subDomain of Object.keys(cnamePlan)) {
      if (!domainGroupItem.keySubDomains.includes(subDomain)) {
        delete cnamePlan[subDomain];
      }
    }

    for (const subDomain of Object.keys(httpPlan)) {
      if (!domainGroupItem.keySubDomains.includes(subDomain)) {
        delete httpPlan[subDomain];
      }
    }
  }
  for (const domain of Object.keys(planRef.value)) {
    const mainDomains = Object.keys(domainGroups);
    if (!mainDomains.includes(domain)) {
      delete planRef.value[domain];
    }
  }
}

watch(
  () => {
    return props.domains && props.defaultType;
  },
  () => {
    onDomainsChanged(props.domains);
  },
  {
    immediate: true,
    deep: true,
  }
);
</script>

<style lang="less">
.domains-verify-plan-editor {
  width: 100%;
  min-height: 100px;
  overflow-x: auto;
  .fullscreen-modal {
    display: none;
  }

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    // background-color: rgba(74, 74, 74, 0.78);
    z-index: 1000;
    margin: auto;
    display: flex;
    justify-content: center;
    align-items: center;
    .plan-wrapper {
      width: 1400px;
      margin: auto;
      //background-color: #a3a3a3;
      //padding: 50px;
      .plan-box {
        position: relative;
        margin: auto;
      }
    }

    .fullscreen-modal {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
  }

  .fullscreen-button {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 1001;
  }

  .plan-table {
    width: 100%;
    height: 100%;
    //table-layout: fixed;
    th {
      // background-color: #f5f5f5;
      border-top: 1px solid #e8e8e8;
      border-left: 1px solid #e8e8e8;
      border-bottom: 1px solid #e8e8e8;
      text-align: left;
      padding: 10px 6px;
    }
    td {
      border-bottom: 2px solid #d8d8d8;
      border-left: 1px solid #e8e8e8;
      padding: 6px 6px;
    }

    .plan {
      td {
        border-right: 1px solid #e8e8e8 !important;
      }
      font-size: 14px;
      .ant-select {
        width: 100%;
      }
      .plan-dns {
        display: flex;
        flex-direction: row;
        justify-content: start;
        align-items: center;
        .form-item {
          min-width: 250px;
          display: flex;
          justify-content: center;
          align-items: center;
          .label {
            width: 80px;
          }
          .input {
            width: 150px;
          }
        }
      }
      .plan-cname {
        .cname-row {
          display: flex;
          flex-direction: row;
          .domain {
            width: 100px;
          }
          .cname-record {
            flex: 1;
          }
        }
      }
    }
  }
}
</style>
