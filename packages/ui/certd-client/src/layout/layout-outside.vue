<template>
  <div id="userLayout" :class="['user-layout-wrapper']">
    <div class="login-container flex-center">
      <div class="user-layout-content">
        <div class="top flex flex-col items-center justify-center">
          <div class="header flex flex-row items-center">
            <img src="/images/logo/rect-black.svg" class="logo" alt="logo" />
            <span class="title"></span>
          </div>
          <div class="desc"></div>
        </div>

        <router-view />

        <div class="footer">
          <!--          <div class="links">-->
          <!--            <a href="_self">帮助</a>-->
          <!--            <a href="_self">隐私</a>-->
          <!--            <a href="_self">条款</a>-->
          <!--          </div>-->
          <div class="copyright">
            <span>Copyright</span>
            <span>&copy;</span>
            <span>{{ envRef.COPYRIGHT_YEAR }}</span>
            <span>
              <a :href="envRef.COPYRIGHT_URL" target="_blank">{{ envRef.COPYRIGHT_NAME }}</a>
            </span>
            <span v-if="envRef.ICP_NO">
              <a href="https://beian.miit.gov.cn/" target="_blank">{{ envRef.ICP_NO }}</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { env } from "/@/utils/util.env";
import { ref } from "vue";

export default {
  name: "LayoutOutside",
  setup() {
    const envRef = ref(env);
    return {
      envRef
    };
  }
};
</script>

<style lang="less" scoped>
#userLayout.user-layout-wrapper {
  height: 100%;

  &.mobile {
    .container {
      .main {
        max-width: 368px;
        width: 98%;
      }
    }
  }

  .login-container {
    width: 100%;
    min-height: 100%;
    background: #f0f2f5 url(/src/assets/background.svg) no-repeat 50%;
    background-size: 100%;
    //padding: 50px 0 84px;
    position: relative;

    .user-layout-lang {
      width: 100%;
      height: 40px;
      line-height: 44px;
      text-align: right;

      .select-lang-trigger {
        cursor: pointer;
        padding: 12px;
        margin-right: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        vertical-align: middle;
      }
    }

    .user-layout-content {
      padding: 32px 0 24px;

      .top {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        .header {
          height: 44px;
          line-height: 44px;

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
            height: 80px;
            vertical-align: top;
            margin-right: 16px;
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
        min-width: 260px;
        width: 368px;
        margin: 0 auto;
      }

      .footer {
        // position: absolute;
        width: 100%;
        bottom: 0;
        margin: 48px 0 24px;
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
