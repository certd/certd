import { useRoute, useRouter } from "vue-router";
import { ref, watch, onMounted, onUnmounted, resolveComponent, nextTick, defineComponent } from "vue";
import getEachDeep from "deepdash-es/getEachDeep";
import _ from "lodash-es";
import BScroll from "better-scroll";
import "./index.less";
const eachDeep = getEachDeep(_);

function useBetterScroll(enabled = true) {
  let bsRef = ref(null);
  let asideMenuRef = ref();

  let onOpenChange = () => {};
  if (enabled) {
    function bsInit() {
      if (asideMenuRef.value == null) {
        return;
      }
      bsRef.value = new BScroll(asideMenuRef.value, {
        mouseWheel: true,
        click: true,
        momentum: false,
        // 如果你愿意可以打开显示滚动条
        scrollbar: {
          fade: true,
          interactive: false
        },
        bounce: false
      });
    }

    function bsDestroy() {
      if (bsRef.value != null && bsRef.value.destroy) {
        try {
          bsRef.value.destroy();
        } catch (e) {
          // console.error(e);
        } finally {
          bsRef.value = null;
        }
      }
    }

    onMounted(() => {
      bsInit();
    });

    onUnmounted(() => {
      bsDestroy();
    });
    onOpenChange = async () => {
      console.log("onOpenChange");
      setTimeout(() => {
        bsRef.value?.refresh();
      }, 300);
    };
  }
  return {
    onOpenChange,
    asideMenuRef
  };
}
export default defineComponent({
  name: "FsMenu",
  inheritAttrs: true,
  props: {
    menus: {},
    expandSelected: {
      default: false
    },
    scroll: {}
  },
  setup(props, ctx) {
    async function open(path) {
      if (path == null) {
        return;
      }
      if (path.startsWith("http://") || path.startsWith("https://")) {
        window.open(path);
        return;
      }
      try {
        const navigationResult = await router.push(path);
        if (navigationResult) {
          // 导航被阻止
        } else {
          // 导航成功 (包括重新导航的情况)
        }
      } catch (e) {
        console.error("导航失败", e);
      }
    }
    function onSelect(item) {
      open(item.key);
    }

    const FsIcon = resolveComponent("FsIcon");

    const buildMenus = (children) => {
      const slots = [];
      if (children == null) {
        return slots;
      }
      for (let sub of children) {
        const title = () => {
          if (sub?.meta?.icon) {
            return (
              <div class={"menu-item-title"}>
                <FsIcon class={"anticon"} icon={sub.meta.icon} />
                <span>{sub.title}</span>
              </div>
            );
          }
          return sub.title;
        };
        if (sub.children && sub.children.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const subSlots = {
            default: () => {
              return buildMenus(sub.children);
            },
            title
          };
          function onTitleClick() {
            if (sub.path && ctx.attrs.mode === "horizontal") {
              open(sub.path);
            }
          }
          slots.push(<a-sub-menu key={sub.index} v-slots={subSlots} onTitleClick={onTitleClick} />);
        } else {
          slots.push(
            <a-menu-item key={sub.path} title={sub.title}>
              {title}
            </a-menu-item>
          );
        }
      }
      return slots;
    };
    const slots = {
      default() {
        return buildMenus(props.menus);
      }
    };
    const selectedKeys = ref([]);
    const openKeys = ref([]);
    const route = useRoute();
    const router = useRouter();

    function openSelectedParents(fullPath) {
      if (!props.expandSelected) {
        return;
      }
      if (props.menus == null) {
        return;
      }
      const keys = [];
      let changed = false;
      eachDeep(props.menus, (value, key, parent, context) => {
        if (value == null) {
          return;
        }
        if (value.path === fullPath) {
          _.forEach(context.parents, (item) => {
            if (item.value instanceof Array) {
              return;
            }
            keys.push(item.value.index);
          });
        }
      });
      if (keys.length > 0) {
        for (let key of keys) {
          if (openKeys.value.indexOf(key) === -1) {
            openKeys.value.push(key);
            changed = true;
          }
        }
      }
      return changed;
    }

    const { asideMenuRef, onOpenChange } = useBetterScroll(props.scroll);

    watch(
      () => {
        return route.fullPath;
      },
      (path) => {
        // path = route.fullPath;
        selectedKeys.value = [path];
        const changed = openSelectedParents(path);
        if (changed) {
          onOpenChange();
        }
      },
      {
        immediate: true
      }
    );
    return () => {
      const menu = (
        <a-menu
          mode={"inline"}
          theme={"light"}
          v-slots={slots}
          onClick={onSelect}
          onOpenChange={onOpenChange}
          v-models={[
            [openKeys.value, "openKeys"],
            [selectedKeys.value, "selectedKeys"]
          ]}
          {...ctx.attrs}
        />
      );
      const classNames = { "fs-menu-wrapper": true, "fs-menu-better-scroll": props.scroll };
      return (
        <div ref={asideMenuRef} class={classNames}>
          {menu}
        </div>
      );
    };
  }
});
