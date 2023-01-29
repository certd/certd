<template>
  <div class="d2-page-cover">
    <div class="d2-page-cover__title" @click="$open('https://github.com/fast-crud/fast-crud')">
      <div class="title-line">
        <img width="50" src="./image/logo.svg" />
        FsAdmin v{{ version }}
      </div>
    </div>
    <p class="d2-page-cover__sub-title">面向配置的crud编程，快速开发crud功能</p>
    <div class="exampleBox">
      <div class="left">
        <fs-highlight :code="helper.crud" lang="javascript" />
      </div>
      <div class="icon">
        <fs-icon :icon="$fsui.icons.arrowRight" />
      </div>
      <div class="right">
        <img style="border: 1px solid #eee" src="./image/crud.png" />
      </div>
    </div>
    <div class="footer_box">
      <div class="left"></div>
      <div class="right">
        <div>如果觉得好用，请不要吝啬你的star哟！</div>
        <a href="https://gitee.com/fast-crud/fast-crud" target="_blank"
          ><img src="https://gitee.com/fast-crud/fast-crud/badge/star.svg?theme=dark" alt="star"
        /></a>
        <a href="https://github.com/fast-crud/fast-crud" target="_blank"
          ><img alt="GitHub stars" src="https://img.shields.io/github/stars/fast-crud/fast-crud?logo=github"
        /></a>
      </div>
    </div>
  </div>
</template>
<script>
import helper from "./helper";

import { defineComponent, ref } from "vue";
export default defineComponent({
  name: "PageCover",
  setup() {
    const version = ref(import.meta.env.VITE_APP_VERSION);

    return {
      version
    };
  },
  data() {
    return {
      helper: helper
    };
  }
});
</script>
<style lang="less" scoped>
.d2-page-cover {
  .logo {
    width: 40px;
    height: 40px;
  }
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  .d2-page-cover__logo {
    img {
      width: 200px;
    }
  }
  .d2-page-cover__title {
    margin: 20px;
    font-weight: bold;
    display: -webkit-flex; /* Safari */
    display: flex;
    justify-content: flex-end;
    .title-line {
      display: flex;
      align-items: center;
      flex-direction: row;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
    }
  }
  .d2-page-cover__sub-title {
    margin: 0px;
    margin-bottom: 10px;
  }
  .d2-page-cover__build-time {
    margin: 0px;
    margin-bottom: 0px;
    margin-top: 10px;
    font-size: 12px;
  }

  .exampleBox {
    display: flex;
    align-items: center;
    height: 390px;
    width: 96%;
    padding: 5px;
    margin: auto;
    justify-content: center;
    .left {
      height: 100%;
      overflow-y: hidden;
      border: 1px solid #aaa;
    }
    .icon {
      padding: 10px;
      font-size: 20px;
    }
    .right {
      height: 100%;
      img {
        height: 100%;
      }
    }
    .d2-highlight {
      font-size: 8px;
    }
  }

  .footer_box {
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    .right {
      display: flex;
      justify-items: center;
      align-items: center;
      & > * {
        display: flex;
      }
    }
  }
}
</style>
