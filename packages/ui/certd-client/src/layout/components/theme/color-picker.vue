<template>
  <div class="fs-theme-color-picker">
    <h4>主题色</h4>
    <div class="fs-theme-colors">
      <a-tooltip v-for="(item, index) in colorList" :key="index" class="fs-theme-color-item">
        <template #title>
          {{ item.key }}
        </template>
        <a-tag :color="item.color" @click="changeColor(item.color)">
          <CheckOutlined v-if="item.color === primaryColor" />
        </a-tag>
      </a-tooltip>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
const colorListDefine = [
  {
    key: "薄暮",
    color: "#f5222d"
  },
  {
    key: "火山",
    color: "#fa541c"
  },
  {
    key: "日暮",
    color: "#faad14"
  },
  {
    key: "明青",
    color: "#13c2c2"
  },
  {
    key: "极光绿",
    color: "#52c41a"
  },
  {
    key: "拂晓蓝（默认）",
    color: "#1890ff"
  },
  {
    key: "极客蓝",
    color: "#2f54eb"
  },
  {
    key: "酱紫",
    color: "#722ed1"
  }
];
export default defineComponent({
  name: "FsThemeColorPicker",
  props: {
    primaryColor: {
      type: String,
      default: "#1890ff"
    }
  },
  emits: ["change"],
  setup(props, ctx) {
    const colorList = ref(colorListDefine);
    function changeColor(color: any) {
      ctx.emit("change", color);
    }
    return {
      colorList,
      changeColor
    };
  }
});
</script>
<style lang="less">
.fs-theme-color-picker {
  .fs-theme-colors {
    margin-top: 10px;
    display: flex;
    justify-content: left;
    justify-items: center;
    align-items: center;
    .fs-theme-color-item {
      width: 20px;
      height: 20px;
      border-radius: 2px;
      cursor: pointer;
      margin-right: 8px;
      padding-left: 0px;
      padding-right: 0px;
      text-align: center;
      color: #fff;
      font-weight: 700;
      display: flex;
      justify-content: center;
      align-items: center;
      i {
        font-size: 14px;
      }
    }
  }
}
</style>
