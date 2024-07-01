<template>
  <div class="d2-page-cover">
    <div class="d2-page-cover__title" @click="$open('https://github.com/certd/certd')">
      <div class="title-line">
        <span>Certd v{{ version }}</span>
      </div>
    </div>
    <p class="d2-page-cover__sub-title">让你的证书永不过期</p>
    <div class="warnning">
      <a-alert type="warning" show-icon>
        <template #description>
          <div class="flex">
            证书和授权为敏感信息，不要使用来历不明的在线CertD服务，以免泄露；请务必私有化部署使用，认准官方版本发布渠道：
            <a class="ml-5 flex" href="https://gitee.com/certd/certd" target="_blank">gitee</a>、
            <a class="ml-5 flex" href="https://github.com/certd/certd" target="_blank">github</a>
          </div>
        </template>
      </a-alert>
    </div>
    <div class="content">
      <img src="/images/preview.png" class="preview_img" />
    </div>
    <div class="footer_box">
      <div>如果觉得好用，请不要吝啬你的star哟！</div>
      <a href="https://gitee.com/certd/certd" target="_blank"><img src="https://gitee.com/certd/certd/badge/star.svg?theme=dark" alt="star" /></a>
      <a href="https://github.com/certd/certd" target="_blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/certd/certd?logo=github" /></a>
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
    width: 70%;
    .preview_img {
      width: 100%;
      border: 1px solid #eee;
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
