<template>
  <fs-page class="page-sys-invite-withdraw">
    <template #header>
      <div class="title">提现申请记录</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts" setup>
import { useMounted } from "/@/use/use-mounted";
import { onActivated, onMounted } from "vue";
import { useMounted } from "/@/use/use-mounted";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud-withdraw";

defineOptions({ name: "SysInviteWithdraw" });

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
useMounted(() => crudExpose.doRefresh());
</script>
