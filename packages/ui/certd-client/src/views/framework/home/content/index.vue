<template>
  <div class="d2-page-cover">
    <div class="d2-page-cover__title" @click="$open('https://github.com/certd/certd')">
      <div class="title-line">Certd v{{ version }}</div>
    </div>
    <p class="d2-page-cover__sub-title">让你的证书永不过期</p>
    <div class="content">
      <img src="./image/preview.png" class="preview_img" />
    </div>
    <div class="footer_box">
      <div class="left"></div>
      <div class="right">
        <div>如果觉得好用，请不要吝啬你的star哟！</div>
        <a href="https://gitee.com/certd/certd" target="_blank"><img src="https://gitee.com/certd/certd/badge/star.svg?theme=dark" alt="star" /></a>
        <a href="https://github.com/certd/certd" target="_blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/certd/certd?logo=github" /></a>
      </div>
    </div>
  </div>
</template>
<script>
import { defineComponent, ref } from "vue";
export default defineComponent({
  name: "PageContent",
  setup() {
    const version = ref(import.meta.env.VITE_APP_VERSION);

    return {
      version
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

  .content {
    padding: 20px;
    width: 80%;
    .preview_img {
      width: 100%;
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
