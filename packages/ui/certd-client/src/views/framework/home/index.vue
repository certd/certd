<template>
  <fs-page class="home—index">
    <page-content />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import PageContent from "./content/index.vue";
export default defineComponent({
  components: { PageContent },
  setup() {}
});
</script>
<style lang="less"></style>
