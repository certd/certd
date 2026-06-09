<template>
  <fs-page>
    <template #header>
      <div class="title">
        {{ t("certd.authorizationManagement") }}
        <span class="sub">{{ t("certd.manageThirdPartyAuth") }}</span>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding"> </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import { createAccessApi } from "/@/views/certd/access/api";
import { useI18n } from "/src/locales";

export default defineComponent({
  name: "AccessManager",
  setup() {
    const { t } = useI18n();
    const api = createAccessApi("user");
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions, context: { api, permission: { isProjectPermission: true } } });
    useMounted(() => crudExpose.doRefresh());

    return {
      crudBinding,
      crudRef,
      t,
    };
  },
});
</script>
