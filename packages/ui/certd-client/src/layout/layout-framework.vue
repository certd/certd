<template xmlns:w="http://www.w3.org/1999/xhtml">
  <a-layout class="fs-framework">
    <a-layout-sider v-model:collapsed="asideCollapsed" :trigger="null" collapsible>
      <div class="header-logo">
        <img src="/images/logo/rect-black.svg" />
        <span v-if="!asideCollapsed" class="title">FsAdmin</span>
      </div>
      <div class="aside-menu">
        <fs-menu :scroll="true" :menus="asideMenus" :expand-selected="!asideCollapsed" />
      </div>
    </a-layout-sider>

    <a-layout class="layout-body">
      <a-layout-header class="header">
        <div class="header-buttons">
          <div class="menu-fold" @click="asideCollapsedToggle">
            <MenuUnfoldOutlined v-if="asideCollapsed" />
            <MenuFoldOutlined v-else />
          </div>
        </div>

        <fs-menu
          class="header-menu"
          mode="horizontal"
          :expand-selected="false"
          :selectable="false"
          :menus="frameworkMenus"
        />
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
          <fs-menu
            class="header-menu"
            mode="horizontal"
            :expand-selected="false"
            :selectable="false"
            :menus="headerMenus"
          />
          <fs-locale class="btn" />
          <!--          <fs-theme-set class="btn" />-->
          <fs-user-info class="btn" />
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
      <a-layout-footer class="fs-framework-footer"
        >by fast-crud
        <fs-source-link />
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script>
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
import { notification } from "ant-design-vue";
export default {
  name: "LayoutFramework",
  // eslint-disable-next-line vue/no-unused-components
  components: { FsThemeSet, MenuFoldOutlined, MenuUnfoldOutlined, FsMenu, FsLocale, FsSourceLink, FsUserInfo, FsTabs },
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
      notification.error({ message: e.message });
      //阻止错误向上传递
      return false;
    });
    return {
      frameworkMenus,
      headerMenus,
      asideMenus,
      keepAlive,
      asideCollapsed,
      asideCollapsedToggle
    };
  }
};
</script>
<style lang="less">
@import "../style/theme/index.less";
.fs-framework {
  height: 100%;
  overflow-x: hidden;
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
  }
  .header-buttons {
    display: flex;
    align-items: center;
    & > * {
      cursor: pointer;
      padding: 0 10px;
    }

    & > .btn {
      &:hover {
        background-color: #fff;
        color: @primary-color;
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
