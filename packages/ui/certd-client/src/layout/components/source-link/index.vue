<template>
  <div v-if="showSourceLink" class="fs-source-link-group">
    <div class="fs-source-link" @click="goSource('https://gitee.com')">本页源码（Gitee）</div>
    <div class="fs-source-link" @click="goSource('https://github.com')">本页源码（Github）</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
export default defineComponent({
  name: "FsSourceLink",
  setup() {
    const router = useRouter();
    const showSourceLink = ref(false);
    watch(
      () => {
        return router.currentRoute.value.fullPath;
      },
      (value) => {
        showSourceLink.value = value !== "/index";
      },
      { immediate: true }
    );
    const middle = "/fast-crud/fs-admin-antdv4/blob/main/src/views";
    function goSource(prefix: any) {
      const path = router.currentRoute.value.fullPath;
      window.open(prefix + middle + path + "/index.vue");
    }
    return {
      goSource,
      showSourceLink
    };
  }
});
</script>

<style lang="less">
.fs-source-link-group {
  position: fixed;
  right: 3px;
  bottom: 20px;
  .fs-source-link {
    text-align: left;
    cursor: pointer;
    font-size: 12px;
    border-radius: 5px 0 0 5px;
    padding: 5px;
    background: #666;
    color: #fff;
    margin-bottom: 5px;
  }
}
</style>
