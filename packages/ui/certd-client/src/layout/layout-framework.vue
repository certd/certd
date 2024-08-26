<template>
  <a-layout class="fs-framework">
    <a-layout-sider v-model:collapsed="asideCollapsed" :trigger="null" collapsible>
      <div class="header-logo">
        <img src="/images/logo/logo.svg" />
        <span v-if="!asideCollapsed" class="title">Certd</span>
      </div>
      <div class="aside-menu">
        <fs-menu :scroll="true" :menus="asideMenus" :expand-selected="!asideCollapsed" />
      </div>
    </a-layout-sider>

    <a-layout class="layout-body">
      <a-layout-header class="header">
        <div class="header-left header-buttons">
          <div class="menu-fold" @click="asideCollapsedToggle">
            <MenuUnfoldOutlined v-if="asideCollapsed" />
            <MenuFoldOutlined v-else />
          </div>
          <fs-menu class="header-menu" mode="horizontal" :expand-selected="false" :selectable="false" :menus="frameworkMenus" />
          <vip-button class="flex-center header-btn"></vip-button>
        </div>
        <div class="header-right header-buttons">
          <!--          <button-->
          <!--            w:bg="blue-400 hover:blue-500 dark:blue-500 dark:hover:blue-600"-->
          <!--            w:text="sm white"-->
          <!--            w:font="mono light"-->
          <!--            w:p="y-2 x-4"-->
          <!--            w:border="2 rounded blue-200"-->
          <!--          >-->
          <!--            Button-->
          <!--          </button>-->
          <fs-menu class="header-menu" mode="horizontal" :expand-selected="false" :selectable="false" :menus="headerMenus" />
          <div class="header-btn">
            <fs-locale />
          </div>
          <!--          <div class="header-btn">-->
          <!--            <fs-theme-mode-set />-->
          <!--          </div>-->
          <div class="header-btn">
            <fs-theme-set />
          </div>
          <div class="header-btn">
            <fs-user-info />
          </div>
        </div>
      </a-layout-header>
      <fs-tabs></fs-tabs>
      <a-layout-content class="fs-framework-content">
        <router-view>
          <template #default="{ Component, route }">
            <transition name="fade-transverse">
              <keep-alive :include="keepAlive">
                <component :is="Component" :key="route.fullPath" />
              </keep-alive>
            </transition>
          </template>
        </router-view>
      </a-layout-content>
      <a-layout-footer class="fs-framework-footer">
        <div>
          <span>Powered by</span>
          <a href="https://certd.handsfree.work"> handsfree.work </a>
        </div>
        <div>v{{ version }}</div>

        <!--        <fs-source-link />-->
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script lang="ts">
import { computed, onErrorCaptured, ref } from "vue";
import FsMenu from "./components/menu/index.jsx";
import FsLocale from "./components/locale/index.vue";
import FsSourceLink from "./components/source-link/index.vue";
import FsUserInfo from "./components/user-info/index.vue";
import FsTabs from "./components/tabs/index.vue";
import { useResourceStore } from "../store/modules/resource";
import { usePageStore } from "/@/store/modules/page";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons-vue";
import FsThemeSet from "/@/layout/components/theme/index.vue";
import { env } from "../utils/util.env";
import FsThemeModeSet from "./components/theme/mode-set.vue";
import VipButton from "/@/components/vip-button/index.vue";
export default {
  name: "LayoutFramework",
  // eslint-disable-next-line vue/no-unused-components
  components: { FsThemeSet, MenuFoldOutlined, MenuUnfoldOutlined, FsMenu, FsLocale, FsSourceLink, FsUserInfo, FsTabs, FsThemeModeSet, VipButton },
  setup() {
    const resourceStore = useResourceStore();
    const frameworkMenus = computed(() => {
      return resourceStore.getFrameworkMenus;
    });
    const headerMenus = computed(() => {
      return resourceStore.getHeaderMenus;
    });
    const asideMenus = computed(() => {
      return resourceStore.getAsideMenus;
    });

    const pageStore = usePageStore();
    const keepAlive = pageStore.keepAlive;

    const asideCollapsed = ref(false);
    function asideCollapsedToggle() {
      asideCollapsed.value = !asideCollapsed.value;
    }
    onErrorCaptured((e) => {
      console.error("ErrorCaptured:", e);
      // notification.error({ message: e.message });
      //阻止错误向上传递
      return false;
    });
    const version = ref(import.meta.env.VITE_APP_VERSION);

    const envRef = ref(env);
    return {
      version,
      frameworkMenus,
      headerMenus,
      asideMenus,
      keepAlive,
      asideCollapsed,
      asideCollapsedToggle,
      envRef
    };
  }
};
</script>
<style lang="less">
@import "../style/theme/index.less";
.fs-framework {
  height: 100%;
  overflow-x: hidden;
  min-width: 1200px;
  .menu-fold {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .header-logo {
    width: 100%;
    height: 50px;
    display: flex;
    justify-items: center;
    align-items: center;
    justify-content: center;

    // margin: 16px 24px 16px 0;
    //background: rgba(255, 255, 255, 0.3);
    img {
      height: 80%;
    }
    .title {
      margin-left: 5px;
      font-weight: bold;
    }
  }
  .fs-framework-content {
    flex: 1;
    border-left: 1px solid #f0f0f0;
  }
  .fs-framework-footer {
    border-left: 1px solid #f0f0f0;
    padding: 10px 20px;
    color: rgba(0, 0, 0, 0.85);
    font-size: 14px;
    background: #f6f6f6;
    display: flex;
    justify-content: space-between;

    > div {
      height: auto;
      padding: 5px;
    }
  }

  .ant-layout-header.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .header-buttons {
      display: flex;
      align-items: center;
      & > * {
        cursor: pointer;
        padding: 0 10px;
      }
      height: 100%;

      & > .header-btn {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        //border-bottom: 1px solid rgba(255, 255, 255, 0);
        &:hover {
          background-color: #fff;
        }
      }
    }
    .header-right {
      justify-content: flex-end;
      align-items: center;
      display: flex;
    }
    .header-menu {
      flex: 1;
    }
  }

  .aside-menu {
    flex: 1;
    ui {
      height: 100%;
    }
    overflow: hidden;
    // overflow-y: auto;
  }

  .layout-body {
    flex: 1;
  }
}
//antdv
.fs-framework {
  &.ant-layout {
    flex-direction: row;
  }

  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
  }

  .ant-layout-sider {
    // border-right: 1px solid #eee;
  }

  .ant-layout-header {
    height: 50px;
    padding: 0 10px;
    line-height: 50px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
  }
  .ant-layout-content {
    background: #fff;
    height: 100%;
    position: relative;
  }
}
//element
.fs-framework {
  .el-aside {
    .el-menu {
      height: 100%;
    }
  }
}
</style>
