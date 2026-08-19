<template>
  <router-view> </router-view>
</template>

<script lang="ts" setup>
import { useSettingStore } from "../store/settings";

const settingsStore = useSettingStore();
</script>
