<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ t("certd.navigation.notification") }}
        <span class="sub">{{ t("certd.navigation.notificationHelper") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "/src/locales";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createAddonApi } from "./api";
import { addonProvide } from "/@/views/certd/addon/common";

export default defineComponent({
  name: "AddonManager",
  setup() {
    const { t } = useI18n();
    const api = createAddonApi({ from: "user", addonType: "" });
    addonProvide(api);
    const { crudBinding, crudRef, crudExpose } = useFs({
      createCrudOptions,
      context: { api, permission: { isProjectPermission: true } },
    });
    useMounted(() => crudExpose.doRefresh());

    return {
      t,
      crudBinding,
      crudRef,
    };
  },
});
</script>
