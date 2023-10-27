import { defineStore } from "pinia";
import { cloneDeep, get, uniq } from "lodash-es";
import router from "/src/router";
import { frameworkRoutes } from "/src/router/resolve";
// @ts-ignore
import { LocalStorage } from "/src/utils/util.storage";
import { useUserStore } from "/src/store/modules/user";
const OPENED_CACHE_KEY = "TABS_OPENED";

interface PageState {
  // 可以在多页 tab 模式下显示的页面
  pool: Array<any>;
  // 当前显示的多页面列表
  opened: Array<any>;
  // 已经加载多标签页数据 https://github.com/d2-projects/d2-admin/issues/201
  openedLoaded: boolean;
  // 当前页面
  current: string;
  // 需要缓存的页面 name
  keepAlive: Array<any>;
  inited: boolean;
}
// 判定是否需要缓存
const isKeepAlive = (data: any) => get(data, "meta.cache", false);

export const usePageStore = defineStore({
  id: "app.page",
  state: (): PageState => ({
    // 可以在多页 tab 模式下显示的页面
    pool: [],
    // 当前显示的多页面列表
    opened: [
      {
        name: "index",
        fullPath: "/index",
        meta: {
          title: "首页",
          auth: false
        }
      }
    ],
    // 已经加载多标签页数据 https://github.com/d2-projects/d2-admin/issues/201
    openedLoaded: false,
    // 当前页面
    current: "",
    // 需要缓存的页面 name
    keepAlive: [],
    inited: false
  }),
  getters: {
    // @ts-ignore
    getOpened(): any {
      // @ts-ignore
      return this.opened;
    },
    getCurrent(): string {
      return this.current;
    }
  },
  actions: {
    /**
     * @description 确认已经加载多标签页数据 https://github.com/d2-projects/d2-admin/issues/201
     * @param {Object} context
     */
    async isLoaded() {
      if (this.openedLoaded) {
        return true;
      }
      return new Promise((resolve) => {
        const timer = setInterval(() => {
          if (this.openedLoaded) {
            resolve(clearInterval(timer));
          }
        }, 10);
      });
    },
    /**
     * @class opened
     * @description 从持久化数据载入标签页列表
     * @param {Object} context
     */
    async openedLoad() {
      // store 赋值
      const value = LocalStorage.get(this.getStorageKey());
      if (value == null) {
        return;
      }
      // 在处理函数中进行数据优化 过滤掉现在已经失效的页签或者已经改变了信息的页签
      // 以 fullPath 字段为准
      // 如果页面过多的话可能需要优化算法
      // valid 有效列表 1, 1, 0, 1 => 有效, 有效, 失效, 有效
      const valid: Array<number> = [];
      // 处理数据
      this.opened = value
        .map((opened: any) => {
          // 忽略首页
          if (opened.fullPath === "/index") {
            valid.push(1);
            return opened;
          }
          // 尝试在所有的支持多标签页的页面里找到 name 匹配的页面
          const find = this.pool.find((item) => item.name === opened.name);
          // 记录有效或无效信息
          valid.push(find ? 1 : 0);
          // 返回合并后的数据 新的覆盖旧的
          // 新的数据中一般不会携带 params 和 query, 所以旧的参数会留存
          return Object.assign({}, opened, find);
        })
        .filter((opened: any, index: any) => valid[index] === 1);
      // 标记已经加载多标签页数据 https://github.com/d2-projects/d2-admin/issues/201
      this.openedLoaded = true;
      // 根据 opened 数据生成缓存设置
      this.keepAliveRefresh();
    },

    getStorageKey() {
      const userStore = useUserStore();
      const userId = userStore.getUserInfo?.id ?? "anonymous";
      return OPENED_CACHE_KEY + ":" + userId;
    },
    /**
     * 将 opened 属性赋值并持久化 在这之前请先确保已经更新了 state.opened
     * @param {Object} context
     */
    async opened2db() {
      // 设置数据

      LocalStorage.set(this.getStorageKey(), this.opened);
    },
    /**
     * @class opened
     * @description 更新页面列表上的某一项
     * @param {Object} context
     * @param {Object} payload { index, params, query, fullPath } 路由信息
     */
    async openedUpdate({ index, params, query, fullPath }: any) {
      // 更新页面列表某一项
      const page = this.opened[index];
      page.params = params || page.params;
      page.query = query || page.query;
      page.fullPath = fullPath || page.fullPath;
      this.opened.splice(index, 1, page);
      // 持久化
      await this.opened2db();
    },
    /**
     * @class opened
     * @description 重排页面列表上的某一项
     * @param {Object} context
     * @param {Object} payload { oldIndex, newIndex } 位置信息
     */
    async openedSort({ oldIndex, newIndex }: any) {
      // 重排页面列表某一项
      const page = this.opened[oldIndex];
      this.opened.splice(oldIndex, 1);
      this.opened.splice(newIndex, 0, page);
      // 持久化
      await this.opened2db();
    },
    /**
     * @class opened
     * @description 新增一个 tag (打开一个页面)
     * @param {Object} context
     * @param {Object} payload new tag info
     */
    async add({ tag, params, query, fullPath }: any) {
      // 设置新的 tag 在新打开一个以前没打开过的页面时使用
      const newTag = tag;
      newTag.params = params || newTag.params;
      newTag.query = query || newTag.query;
      newTag.fullPath = fullPath || newTag.fullPath;
      // 添加进当前显示的页面数组
      this.opened.push(newTag);
      // 如果这个页面需要缓存 将其添加到缓存设置
      if (isKeepAlive(newTag)) {
        this.keepAlivePush(tag.name);
      }
      // 持久化
      await this.opened2db();
    },
    /**
     * @class current
     * @description 打开一个新的页面
     * @param {Object} context
     * @param {Object} payload 从路由钩子的 to 对象上获取 { name, params, query, fullPath, meta } 路由信息
     */
    async open({ name, params, query, fullPath, meta }: any) {
      // 已经打开的页面
      const opened = this.opened;
      // 判断此页面是否已经打开 并且记录位置
      let pageOpendIndex = 0;
      const pageOpend = opened.find((page, index) => {
        const same = page.fullPath === fullPath;
        pageOpendIndex = same ? index : pageOpendIndex;
        return same;
      });
      if (pageOpend) {
        // 页面以前打开过
        await this.openedUpdate({
          index: pageOpendIndex,
          params,
          query,
          fullPath
        });
      } else {
        // 页面以前没有打开过
        const page = this.pool.find((t) => t.name === name);
        // 如果这里没有找到 page 代表这个路由虽然在框架内 但是不参与标签页显示
        if (page) {
          this.add({
            tag: Object.assign({}, page),
            params,
            query,
            fullPath
          });
        }
      }
      // 如果这个页面需要缓存 将其添加到缓存设置
      if (isKeepAlive({ meta })) {
        this.keepAlivePush(name);
      }
      // 设置当前的页面
      this.currentSet(fullPath);
    },
    /**
     * @class opened
     * @description 关闭一个 tag (关闭一个页面)
     * @param {Object} context
     * @param {Object} payload { tagName: 要关闭的标签名字 }
     */
    async close({ tagName }: any) {
      // 预定下个新页面
      let newPage = {};
      const isCurrent = this.current === tagName;
      // 如果关闭的页面就是当前显示的页面
      if (isCurrent) {
        // 去找一个新的页面
        const len = this.opened.length;
        for (let i = 0; i < len; i++) {
          if (this.opened[i].fullPath === tagName) {
            newPage = i < len - 1 ? this.opened[i + 1] : this.opened[i - 1];
            break;
          }
        }
      }
      // 找到这个页面在已经打开的数据里是第几个
      const index = this.opened.findIndex((page) => page.fullPath === tagName);
      if (index >= 0) {
        // 如果这个页面是缓存的页面 将其在缓存设置中删除
        this.keepAliveRemove(this.opened[index].name);
        // 更新数据 删除关闭的页面
        this.opened.splice(index, 1);
      }
      // 持久化
      await this.opened2db();
      // 决定最后停留的页面
      if (isCurrent) {
        // @ts-ignore
        const { name = "index", params = {}, query = {} } = newPage;
        const routerObj = { name, params, query };
        await router.push(routerObj);
      }
    },
    /**
     * @class opened
     * @description 关闭当前标签左边的标签
     * @param opts
     */
    async closeLeft(opts = {}) {
      await this.closeByCondition({
        condition({ i, currentIndex }: any) {
          return i >= currentIndex;
        },
        ...opts
      });
    },
    /**
     * @class opened
     * @description 关闭当前标签右边的标签
     * @param opts
     */
    async closeRight(opts = {}) {
      await this.closeByCondition({
        condition({ i, currentIndex }: any) {
          return currentIndex >= i;
        },
        ...opts
      });
    },
    /**
     * @class opened
     * @description 关闭当前标签右边的标签
     * @param opts
     */
    async closeByCondition(opts = {}) {
      // @ts-ignore
      const { pageSelect, condition } = opts;
      const pageAim = pageSelect || this.current;
      let currentIndex = 0;
      this.opened.forEach((page, index) => {
        if (page.fullPath === pageAim) currentIndex = index;
      });
      // 删除打开的页面 并在缓存设置中删除
      for (let i = this.opened.length - 1; i >= 0; i--) {
        if (this.opened[i].name === "index" || condition({ i, currentIndex })) {
          continue;
        }
        this.keepAliveRemove(this.opened[i].name);
        this.opened.splice(i, 1);
      }
      // 持久化
      await this.opened2db();
      // 设置当前的页面
      this.current = pageAim;
      // @ts-ignore
      if (router.currentRoute.fullPath !== pageAim) await router.push(pageAim);
    },
    /**
     * @class opened
     * @description 关闭当前激活之外的 tag
     * @param opts
     */
    async closeOther(opts = {}) {
      await this.closeByCondition({
        condition({ i, currentIndex }: any) {
          return currentIndex === i;
        },
        ...opts
      });
    },
    /**
     * @class opened
     * @description 关闭所有 tag
     * @param {Object} context
     */
    async closeAll() {
      // 删除打开的页面 并在缓存设置中删除
      for (let i = this.opened.length - 1; i >= 0; i--) {
        if (this.opened[i].name === "index") {
          continue;
        }

        this.keepAliveRemove(this.opened[i].name);
        this.opened.splice(i, 1);
      }
      // 持久化
      await this.opened2db();
      // 关闭所有的标签页后需要判断一次现在是不是在首页
      // @ts-ignore
      if (router.currentRoute.name !== "index") {
        await router.push({ name: "index" });
      }
    },
    /**
     * @class keepAlive
     * @description 从已经打开的页面记录中更新需要缓存的页面记录
     * @param {Object} state state
     */
    keepAliveRefresh() {
      this.keepAlive = this.opened.filter((item) => isKeepAlive(item)).map((e) => e.name);
      console.log("keepalive", this.keepAlive);
    },
    /**
     * @description 删除一个页面的缓存设置
     * @param {Object} state state
     * @param {String} name name
     */
    keepAliveRemove(name: string) {
      const list = cloneDeep(this.keepAlive);
      const index = list.findIndex((item) => item === name);
      if (index !== -1) {
        list.splice(index, 1);
        this.keepAlive = list;
      }
    },
    /**
     * @description 增加一个页面的缓存设置
     * @param {Object} state state
     * @param {String} name name
     */
    keepAlivePush(name: string) {
      const keep = cloneDeep(this.keepAlive);
      keep.push(name);
      this.keepAlive = uniq(keep);
    },
    /**
     * @description 清空页面缓存设置
     * @param {Object} state state
     */
    keepAliveClean() {
      this.keepAlive = [];
    },
    /**
     * @class current
     * @description 设置当前激活的页面 fullPath
     * @param {Object} state state
     * @param {String} fullPath new fullPath
     */
    currentSet(fullPath: string) {
      this.current = fullPath;
    },
    /**
     * @class pool
     * @description 保存 pool (候选池)
     * @param {Object} state state
     * @param {Array} routes routes
     */
    async init(routes?: any) {
      if (this.inited) {
        return;
      }
      this.inited = true;
      if (routes == null) {
        //不能用全部的routes，只能是framework内的
        routes = frameworkRoutes;
      }

      const pool: any = [];
      const push = function (routes: any) {
        routes.forEach((route: any) => {
          if (route.children && route.children.length > 0) {
            push(route.children);
          } else {
            if (!route.hidden) {
              const { meta, name, path } = route;
              // @ts-ignore
              pool.push({ meta, name, path });
            }
          }
        });
      };
      push(routes);
      this.pool = pool;
      await this.openedLoad();
    }
  }
});
