<template>
  <div class="fs-multiple-page-control-group">
    <div class="fs-multiple-page-control-content">
      <div class="fs-multiple-page-control-content-inner">
        <a-tabs class="fs-multiple-page-control fs-multiple-page-sort" :active-key="page.getCurrent" type="editable-card" hide-add @tab-click="handleClick" @edit="handleTabEdit">
          <a-tab-pane v-for="item in page.getOpened" :key="item.fullPath" :tab="item.meta?.title || '未命名'" :name="item.fullPath" :closable="isTabClosable(item)" />
        </a-tabs>
        <!--        <fs-contextmenu v-model:open="contextmenuFlag" :x="contentmenuX" :y="contentmenuY">-->
        <!--          <fs-contextmenu-list-->
        <!--            :menulist="tagName === '/index' ? contextmenuListIndex : contextmenuList"-->
        <!--            @rowClick="contextmenuClick"-->
        <!--          />-->
        <!--        </fs-contextmenu>-->
      </div>
    </div>

    <div class="fs-multiple-page-control-btn">
      <a-dropdown-button class="control-btn-dropdown" split-button @click="closeAll">
        <fs-icon icon="ion:close-circle"></fs-icon>
        <template #icon><DownOutlined /></template>
        <template #overlay>
          <a-menu @click="(command: any) => handleControlItemClick(command)">
            <a-menu-item key="left">
              <fs-icon name="arrow-left" class="fs-mr-10" />
              关闭左侧
            </a-menu-item>
            <a-menu-item key="right">
              <fs-icon name="arrow-right" class="fs-mr-10" />
              关闭右侧
            </a-menu-item>
            <a-menu-item key="other">
              <fs-icon name="times" class="fs-mr-10" />
              关闭其它
            </a-menu-item>
            <a-menu-item key="all">
              <fs-icon name="times-circle" class="fs-mr-10" />
              全部关闭
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown-button>
    </div>
  </div>
</template>

<script lang="ts">
import { usePageStore } from "../../../store/modules/page";
import { computed } from "vue";
export default {
  name: "FsTabs",
  components: {
    // FsContextmenu: () => import("../contextmenu/index.vue"),
    // FsContextmenuList: () => import("../contextmenu/components/contentmenuList/index.vue")
  },
  setup() {
    const pageStore = usePageStore();

    const actions = {
      close: pageStore.close,
      closeLeft: pageStore.closeLeft,
      closeRight: pageStore.closeRight,
      closeOther: pageStore.closeOther,
      closeAll: pageStore.closeAll,
      openedSort: pageStore.openedSort
    };
    console.log("opened", pageStore.getOpened);
    const computeOpened = computed(() => {
      console.log("opened", pageStore.getOpened);
      return pageStore.getOpened;
    });

    return {
      page: pageStore,
      ...actions,
      computeOpened
    };
  },
  data() {
    return {
      contextmenuFlag: false,
      contentmenuX: 0,
      contentmenuY: 0,
      contextmenuListIndex: [{ icon: "times-circle", title: "关闭全部", value: "all" }],
      contextmenuList: [
        { icon: "arrow-left", title: "关闭左侧", value: "left" },
        { icon: "arrow-right", title: "关闭右侧", value: "right" },
        { icon: "times", title: "关闭其它", value: "other" },
        { icon: "times-circle", title: "关闭全部", value: "all" }
      ],
      tagName: "/index"
    };
  },
  mounted() {
    const el = document.querySelectorAll(".fs-multiple-page-sort .el-tabs__nav")[0];
    // Sortable.create(el, {
    //   onEnd: (evt) => {
    //     const { oldIndex, newIndex } = evt;
    //     this.openedSort({ oldIndex, newIndex });
    //   }
    // });
  },
  methods: {
    /**
     * @description 计算某个标签页是否可关闭
     * @param {Object} page 其中一个标签页
     */
    isTabClosable(page: any) {
      return page.name !== "index";
    },
    /**
     * @description 右键菜单功能点击
     * @param {Object} event 事件
     */
    handleContextmenu(event: any) {
      let target = event.target;
      // fix https://github.com/fs-projects/fs-admin/issues/54
      let flag = false;
      if (target.className.indexOf("el-tabs__item") > -1) flag = true;
      else if (target.parentNode.className.indexOf("el-tabs__item") > -1) {
        target = target.parentNode;
        flag = true;
      }
      if (flag) {
        event.preventDefault();
        event.stopPropagation();
        this.contentmenuX = event.clientX;
        this.contentmenuY = event.clientY;
        this.tagName = target.getAttribute("aria-controls").slice(5);
        this.contextmenuFlag = true;
      }
    },
    /**
     * @description 右键菜单的 row-click 事件
     * @param {String} command 事件类型
     */
    contextmenuClick(command: any) {
      this.handleControlItemClick(command, this.tagName);
    },
    /**
     * @description 接收点击关闭控制上选项的事件
     * @param {String} command 事件类型
     * @param {String} tagName tab 名称
     */
    handleControlItemClick(command: any, tagName: any = null) {
      //if (tagName) this.contextmenuFlag = false;
      const params = { pageSelect: tagName };
      switch (command.key) {
        case "left":
          this.closeLeft(params);
          break;
        case "right":
          this.closeRight(params);
          break;
        case "other":
          this.closeOther(params);
          break;
        case "all":
          this.closeAll();
          break;
        default:
          this.$message.error("无效的操作");
          break;
      }
    },
    /**
     * @description 接收点击 tab 标签的事件
     * @param {object} tab 标签
     * @param {object} event 事件
     */
    handleClick(tab: any) {
      // 找到点击的页面在 tag 列表里是哪个
      const page = this.page.getOpened.find((page: any) => page.fullPath === tab);
      if (page) {
        const { name, params, query } = page;
        this.$router.push({ name, params, query });
      }
    },
    /**
     * @description 点击 tab 上的删除按钮触发这里
     * @param {String} tagName tab 名称
     */
    handleTabEdit(tagName: any, action: any) {
      if (action === "remove") {
        this.close({ tagName });
      }
    }
  } as any
};
</script>
<style lang="less">
//common
.fs-multiple-page-control-group {
  width: 100%;
  display: flex;
  .fs-multiple-page-control-content {
    flex: 1;
    overflow-x: auto;
  }
  .fs-multiple-page-control-btn {
    flex: 0;
  }
}
//antdv
.fs-multiple-page-control-group {
  .ant-tabs-tab-remove {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .ant-tabs-bar {
    margin: 0;
    border-bottom: 1px solid #f0f0f0;
  }
  .ant-tabs-top > .ant-tabs-nav,
  .ant-tabs-bottom > .ant-tabs-nav,
  .ant-tabs-top > div > .ant-tabs-nav,
  .ant-tabs-bottom > div > .ant-tabs-nav {
    margin: 0;
  }
  .ant-tabs.ant-tabs-card .ant-tabs-card-bar .ant-tabs-nav {
    .ant-tabs-tab {
      margin-right: 0;
      border-right: 0;

      &:first-of-type {
        border-top-left-radius: 2px;
      }
      &:last-of-type {
        border-top-right-radius: 2px;
        border-right: 1px;
      }

      &:not(.ant-tabs-tab-active) {
        color: #666;
      }
    }
    .ant-tabs-tab-active {
      border-bottom-color: #fff;
    }
  }
  .ant-tabs-close-x {
    display: none;
  }
  .ant-tabs-tab {
    &:hover {
      .ant-tabs-close-x {
        display: initial;
      }
    }
  }
  .ant-tabs-tab-active {
    .ant-tabs-close-x {
      display: initial;
    }
  }

  .fs-multiple-page-control-btn {
    display: flex;
    .ant-btn {
      display: flex;
      align-items: center;
      justify-items: center;
      height: 100%;
      color: #666;
      border-bottom: 1px solid #f0f0f0;
    }
    .control-btn-dropdown {
      text-align: center;
    }
  }

  .ant-tabs-tab-arrow-show {
    border: 1px solid #e5e7eb;
  }
  .ant-tabs-tab-prev {
    border-right: 0;
    border-bottom: 0;
  }
  .ant-tabs-tab-next {
    border-left: 0;
    border-bottom: 0;
  }
}
//element
</style>
