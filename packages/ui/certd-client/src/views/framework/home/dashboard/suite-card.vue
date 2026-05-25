<template>
  <div v-if="detail.enabled" class="my-suite-card">
    <div class="flex-o flex-wrap">
      <a-popover>
        <template #content>
          <div style="width: 300px">
            <div v-if="hiddenSuiteList.length > 0 || detail.addonList.length > 0" class="flex flex-wrap">
              <a-tag v-for="(item, index) of hiddenSuiteList" :key="`suite-${index}`" color="green" class="pointer flex-o m-1">
                <span class="mr-5">
                  {{ item.title }}
                </span>
                <span>(<expires-time-text :value="item.expiresTime" />)</span>
              </a-tag>
              <a-tag v-for="(item, index) of detail.addonList" :key="`addon-${index}`" color="green" class="pointer flex-o m-1">
                <span class="mr-5">
                  {{ item.title }}
                </span>
                <span>(<expires-time-text :value="item.expiresTime" />)</span>
              </a-tag>
              <a-divider class="m-5" />
            </div>
            <div class="flex-between mt-5">
              <div class="flex-o"><fs-icon icon="ant-design:check-outlined" class="color-green mr-5" /> 流水线条数：</div>
              <suite-value :model-value="detail.pipelineCount.max" :used="detail.pipelineCount.used" unit="条" />
            </div>
            <div class="flex-between mt-5">
              <div class="flex-o">
                <fs-icon icon="ant-design:check-outlined" class="color-green mr-5" />
                域名总数量：
              </div>
              <suite-value :model-value="detail.domainCount.max" :used="detail.domainCount.used" unit="个" />
            </div>
            <div class="flex-between mt-5">
              <div class="flex-o ml-20">- 其中泛域名数量：</div>
              <suite-value :model-value="detail.wildcardDomainCount.max" :used="detail.wildcardDomainCount.used" unit="个" />
            </div>
            <div class="flex-between mt-5">
              <div class="flex-o">
                <fs-icon icon="ant-design:check-outlined" class="color-green mr-5" />
                部署次数：
              </div>
              <suite-value :model-value="detail.deployCount.max" :used="detail.deployCount.used" unit="次" />
            </div>
            <div class="flex-between mt-5">
              <div class="flex-o"><fs-icon icon="ant-design:check-outlined" class="color-green mr-5" /> 监控站点数：</div>
              <suite-value :model-value="detail.monitorCount.max" :used="detail.monitorCount.used" unit="个" />
            </div>
          </div>
        </template>
        <div class="flex-o">
          <fs-icon icon="ant-design:gift-outlined" class="color-green mr-5" />
          <a-tag v-if="currentSuite" color="green" class="pointer flex-o">
            <span class="mr-5">
              {{ currentSuite.title }}
            </span>
            <span>(<expires-time-text :value="currentSuite.expiresTime" />)</span>
            <span v-if="hiddenCount > 0" class="ml-5">+{{ hiddenCount }}</span>
          </a-tag>
          <div v-if="detail.suites?.length === 0" class="flex-o ml-5">暂无套餐 <a-button class="ml-5" type="primary" size="small" @click="goBuy">去购买</a-button></div>
        </div>
      </a-popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import SuiteValue from "/@/views/sys/suite/product/suite-value.vue";
import { computed, ref } from "vue";
import ExpiresTimeText from "/@/components/expires-time-text.vue";
import { mySuiteApi, SuiteDetail } from "/@/views/certd/suite/mine/api";
import { FsIcon } from "@fast-crud/fast-crud";
import { useRouter } from "vue-router";

defineOptions({
  name: "SuiteCard",
});

const detail = ref<SuiteDetail>({});

const currentSuite = computed(() => detail.value.suiteList?.[0]);
const hiddenSuiteList = computed(() => detail.value.suiteList?.slice(1) || []);
const hiddenCount = computed(() => hiddenSuiteList.value.length + (detail.value.addonList?.length || 0));

async function loadSuiteDetail() {
  detail.value = await mySuiteApi.SuiteDetailGet();
  const suites = detail.value.suites.filter(item => item.productType === "suite");
  const addons = detail.value.suites.filter(item => item.productType === "addon");
  detail.value.suiteList = suites;
  detail.value.addonList = addons;
}

loadSuiteDetail();

const router = useRouter();
function goBuy() {
  router.push({
    path: "/certd/suite/buy",
  });
}
</script>
