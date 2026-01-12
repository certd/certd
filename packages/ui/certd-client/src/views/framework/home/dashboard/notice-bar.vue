<template>
  <a-carousel v-if="list?.length" class="notice-bar pointer" arrows dots-class="slick-dots slick-thumb" autoplay dot-position="right">
    <a-alert v-for="(item, index) in list" :key="index" type="warning" show-icon>
      <template #message>
        <div @click="handleClick(item)" v-html="item"></div>
      </template>
    </a-alert>
  </a-carousel>
</template>

<script setup lang="ts">
import { Modal } from "ant-design-vue";
import { h } from "vue";
const props = defineProps<{
  list: string[];
}>();

const handleClick = (item: string) => {
  Modal.info({
    title: "公告",
    width: 700,
    maskClosable: true,
    content: () => {
      return h("div", {
        innerHTML: item,
      });
    },
  });
};
</script>

<style lang="less">
.notice-bar {
  .ant-alert-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
