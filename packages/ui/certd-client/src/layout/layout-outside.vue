<template>
  <div id="userLayout" :class="['user-layout-wrapper']">
    <div class="login-container flex-center">
      <div class="user-layout-content flex-center flex-col">
        <div class="top flex flex-col items-center justify-center">
          <div class="header flex flex-row items-center">
            <img :src="siteInfo.loginLogo" class="logo" alt="logo" />
            <span class="title"></span>
          </div>
          <div class="desc">{{ siteInfo.slogan }}</div>
        </div>

        <router-view />

        <div class="footer">
          <div class="copyright">
            <span v-if="!settingStore.isComm">
              <span>Copyright</span>
              <span>&copy;</span>
              <span>{{ envRef.COPYRIGHT_YEAR }}</span>
              <span>
                <a :href="envRef.COPYRIGHT_URL" target="_blank">{{ envRef.COPYRIGHT_NAME }}</a>
              </span>
            </span>

            <span v-if="siteInfo.licenseTo">
              <a-divider type="vertical" />
              <a :href="siteInfo.licenseToUrl" target="_blank">{{ siteInfo.licenseTo }}</a>
            </span>
            <span v-if="sysPublic.icpNo">
              <a-divider type="vertical" />
              <a href="https://beian.miit.gov.cn/" target="_blank">{{ sysPublic.icpNo }}</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { env } from "/@/utils/util.env";
import { computed, ref, Ref } from "vue";
import { useSettingStore } from "/@/store/modules/settings";
import { SiteInfo, SysPublicSetting } from "/@/api/modules/api.basic";

const envRef = ref(env);
const settingStore = useSettingStore();
const siteInfo: Ref<SiteInfo> = computed(() => {
  return settingStore.siteInfo;
});
const sysPublic: Ref<SysPublicSetting> = computed(() => {
  return settingStore.sysPublic;
});
</script>

<style lang="less">
#userLayout.user-layout-wrapper {
  height: 100%;

  &.mobile {
    .container {
      .main {
        max-width: 368px;
        width: 96%;
      }
    }
  }

  .login-container {
    width: 100%;
    height: 100%;
    background: #f0f2f5 url(/static/background.svg) no-repeat 50%;
    background-size: 100%;
    //padding: 50px 0 84px;
    position: relative;

    .user-layout-content {
      height: 100%;

      .top {
        margin-top: 100px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .header {
          height: 70px;
          line-height: 70px;

          .badge {
            position: absolute;
            display: inline-block;
            line-height: 1;
            vertical-align: middle;
            margin-left: -12px;
            margin-top: -10px;
            opacity: 0.8;
          }

          .logo {
            height: 100%;
            vertical-align: top;
            border-style: none;
          }

          .title {
            font-size: 33px;
            color: rgba(0, 0, 0, 0.85);
            font-family: Avenir, "Helvetica Neue", Arial, Helvetica, sans-serif;
            font-weight: 600;
            position: relative;
            top: 2px;
          }
        }
        .desc {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.45);
          margin-top: 12px;
          margin-bottom: 40px;
        }
      }

      .main {
        width: 400px;
        max-width: 90vw;
        flex: 1;
      }

      .footer {
        // position: absolute;
        width: 100%;
        bottom: 0;
        margin: 24px 0 24px;
        text-align: center;

        .links {
          margin-bottom: 8px;
          font-size: 14px;
          a {
            color: rgba(0, 0, 0, 0.45);
            transition: all 0.3s;
            &:not(:last-child) {
              margin-right: 40px;
            }
          }
        }
        .copyright {
          color: rgba(0, 0, 0, 0.45);
          font-size: 14px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          span {
            margin-left: 5px;
            margin-right: 5px;
          }
          a {
            color: rgba(0, 0, 0, 0.45);
            transition: all 0.3s;

            &:hover {
              color: rgba(0, 0, 0, 0.85);
            }
          }
        }
      }
    }

    a {
      text-decoration: none;
    }
  }
}
</style>
