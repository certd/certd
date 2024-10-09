<template>
  <div class="domains-verify-plan-editor" :class="{ fullscreen }">
    <div class="fullscreen-modal" @click="fullscreenExit"></div>
    <div class="plan-wrapper">
      <div class="plan-box">
        <div class="fullscreen-button pointer flex-center" @click="fullscreen = !fullscreen">
          <span v-if="!fullscreen" style="font-size: 10px" class="flex-center">
            这里可以放大
            <fs-icon icon="ion:arrow-forward-outline"></fs-icon>
          </span>
          <fs-icon :icon="fullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'"></fs-icon>
        </div>
        <table class="plan-table">
          <thead>
            <tr>
              <th>域名</th>
              <th>验证方式</th>
              <th>验证计划</th>
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
                      <span class="label">DNS类型：</span>
                      <span class="input">
                        <fs-dict-select
                          v-model="item.dnsProviderType"
                          size="small"
                          :dict="dnsProviderTypeDict"
                          placeholder="DNS提供商"
                          @change="onPlanChanged"
                        ></fs-dict-select>
                      </span>
                    </div>
                    <a-divider type="vertical" />
                    <div class="form-item">
                      <span class="label">DNS授权：</span>
                      <span class="input">
                        <access-selector
                          v-model="item.dnsProviderAccessId"
                          size="small"
                          :type="item.dnsProviderType"
                          placeholder="请选择"
                          @change="onPlanChanged"
                        ></access-selector>
                      </span>
                    </div>
                  </div>
                  <div v-if="item.type === 'cname'" class="plan-cname">
                    <cname-verify-plan v-model="item.cnameVerifyPlan" @change="onPlanChanged" />
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
import { dict, FsDictSelect } from "@fast-crud/fast-crud";
import AccessSelector from "/@/views/certd/access/access-selector/index.vue";
import CnameVerifyPlan from "./cname-verify-plan.vue";
import psl from "psl";
defineOptions({
  name: "DomainsVerifyPlanEditor"
});

type DomainVerifyPlanInput = {
  domain: string;
  type: "cname" | "dns";
  dnsProviderType?: string;
  dnsProviderAccessId?: number;
  cnameVerifyPlan?: Record<string, CnameRecord>;
};
type DomainsVerifyPlanInput = {
  [key: string]: DomainVerifyPlanInput;
};

const challengeTypeOptions = ref<any[]>([
  {
    label: "DNS验证",
    value: "dns"
  },
  {
    label: "CNAME验证",
    value: "cname"
  }
]);

const props = defineProps<{
  modelValue?: DomainsVerifyPlanInput;
  domains?: string[];
}>();

const emit = defineEmits<{
  "update:modelValue": any;
}>();

const fullscreen = ref(false);
function fullscreenExit() {
  if (fullscreen.value) {
    fullscreen.value = false;
  }
}
const planRef = ref<DomainsVerifyPlanInput>(props.modelValue || {});
const dnsProviderTypeDict = dict({
  url: "pi/dnsProvider/dnsProviderTypeDict"
});
function onPlanChanged() {
  emit("update:modelValue", planRef.value);
}

const errorMessageRef = ref<string>("");
function showError(error: string) {
  errorMessageRef.value = error;
}

type DomainGroup = Record<
  string,
  {
    [key: string]: CnameRecord;
  }
>[];

function onDomainsChanged(domains: string[]) {
  console.log("域名变化", domains);
  if (domains == null) {
    return;
  }

  const domainGroups: DomainGroup = {};
  for (let domain of domains) {
    domain = domain.replace("*.", "");
    const parsed = psl.parse(domain);
    if (parsed.error) {
      showError(`域名${domain}解析失败: ${JSON.stringify(parsed.error)}`);
      continue;
    }
    const mainDomain = parsed.domain;
    if (mainDomain == null) {
      continue;
    }
    let group = domainGroups[mainDomain];
    if (!group) {
      group = {};
      domainGroups[mainDomain] = group;
    }
    group[domain] = {
      id: 0
    };
  }

  for (const domain in domainGroups) {
    let planItem = planRef.value[domain];
    const subDomains = domainGroups[domain];
    if (!planItem) {
      planItem = {
        domain,
        type: "cname",
        cnameVerifyPlan: {
          ...subDomains
        }
      };
      planRef.value[domain] = planItem;
    } else {
      const cnamePlan = planItem.cnameVerifyPlan;
      for (const subDomain in subDomains) {
        if (!cnamePlan[subDomain]) {
          cnamePlan[subDomain] = {
            id: 0
          };
        }
      }
      for (const subDomain of Object.keys(cnamePlan)) {
        if (!subDomains[subDomain]) {
          delete cnamePlan[subDomain];
        }
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
    return props.domains;
  },
  (domains: string[]) => {
    onDomainsChanged(domains);
  },
  {
    immediate: true,
    deep: true
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
    background-color: rgba(74, 74, 74, 0.78);
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
        background-color: #fff;
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
      background-color: #f5f5f5;
      border-top: 1px solid #e8e8e8;
      border-left: 1px solid #e8e8e8;
      border-bottom: 1px solid #e8e8e8;
      text-align: left;
      padding: 10px 6px;
    }
    td {
      border-bottom: 1px solid #e8e8e8;
      border-left: 1px solid #e8e8e8;
      padding: 6px 6px;
    }

    .plan {
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
