<script lang="ts" setup>
import type { UseResizeObserverReturn } from "@vueuse/core";

import type { SetupContext, VNodeArrayChildren } from "vue";

import type { MenuItemClicked, MenuItemRegistered, MenuProps, MenuProvider } from "../types";

import { computed, nextTick, reactive, ref, toRef, useSlots, watch, watchEffect } from "vue";

import { useNamespace } from "../../composables";
import { Ellipsis } from "../../icons";
import { isHttpUrl } from "../../shared/utils";

import { useResizeObserver } from "@vueuse/core";

import { createMenuContext, createSubMenuContext, useMenuStyle } from "../hooks";
import { flattedChildren } from "../utils";
import SubMenu from "./sub-menu.vue";

interface Props extends MenuProps {}

// @ts-ignore
// eslint-disable-next-line vue/multi-word-component-names,vue/no-reserved-component-names
defineOptions({ name: "Menu" });

const props = withDefaults(defineProps<Props>(), {
  accordion: true,
  collapse: false,
  mode: "vertical",
  rounded: true,
  theme: "dark",
});

const emit = defineEmits<{
  close: [string, string[]];
  open: [string, string[]];
  select: [string, string[]];
}>();

const { b, is } = useNamespace("menu");
const menuStyle = useMenuStyle();
const slots: SetupContext["slots"] = useSlots();
const menu = ref<HTMLUListElement>();
const sliceIndex = ref(-1);
const openedMenus = ref<MenuProvider["openedMenus"]>(props.defaultOpeneds && !props.collapse ? [...props.defaultOpeneds] : []);
const activePath = ref<MenuProvider["activePath"]>(props.defaultActive);
const items = ref<MenuProvider["items"]>({});
const subMenus = ref<MenuProvider["subMenus"]>({});
const mouseInChild = ref(false);

const isMenuPopup = computed<MenuProvider["isMenuPopup"]>(() => {
  return props.mode === "horizontal" || (props.mode === "vertical" && props.collapse);
});

const getSlot = computed(() => {
  // 更新插槽内容
  const defaultSlots: VNodeArrayChildren = slots.default?.() ?? [];

  const originalSlot = flattedChildren(defaultSlots) as VNodeArrayChildren;
  const slotDefault = sliceIndex.value === -1 ? originalSlot : originalSlot.slice(0, sliceIndex.value);

  const slotMore = sliceIndex.value === -1 ? [] : originalSlot.slice(sliceIndex.value);

  return { showSlotMore: slotMore.length > 0, slotDefault, slotMore };
});

watch(
  () => props.collapse,
  value => {
    if (value) openedMenus.value = [];
  }
);

watch(items.value, initMenu);

watch(
  () => props.defaultActive,
  (currentActive = "") => {
    if (!items.value[currentActive]) {
      activePath.value = "";
    }
    updateActiveName(currentActive);
  }
);

let resizeStopper: UseResizeObserverReturn["stop"];
watchEffect(() => {
  if (props.mode === "horizontal") {
    resizeStopper = useResizeObserver(menu, handleResize).stop;
  } else {
    resizeStopper?.();
  }
});

// 注入上下文
createMenuContext(
  reactive({
    activePath,
    addMenuItem,
    addSubMenu,
    closeMenu,
    handleMenuItemClick,
    handleSubMenuClick,
    isMenuPopup,
    openedMenus,
    openMenu,
    props,
    removeMenuItem,
    removeSubMenu,
    subMenus,
    theme: toRef(props, "theme"),
    items,
  })
);

createSubMenuContext({
  addSubMenu,
  level: 1,
  mouseInChild,
  removeSubMenu,
});

function calcMenuItemWidth(menuItem: HTMLElement) {
  const computedStyle = getComputedStyle(menuItem);
  const marginLeft = Number.parseInt(computedStyle.marginLeft, 10);
  const marginRight = Number.parseInt(computedStyle.marginRight, 10);
  return menuItem.offsetWidth + marginLeft + marginRight || 0;
}

function calcSliceIndex() {
  if (!menu.value) {
    return -1;
  }
  const items = [...(menu.value?.childNodes ?? [])].filter(
    item =>
      // remove comment type node #12634
      item.nodeName !== "#comment" && (item.nodeName !== "#text" || item.nodeValue)
  ) as HTMLElement[];

  const moreItemWidth = 46;
  const computedMenuStyle = getComputedStyle(menu?.value);

  const paddingLeft = Number.parseInt(computedMenuStyle.paddingLeft, 10);
  const paddingRight = Number.parseInt(computedMenuStyle.paddingRight, 10);
  const menuWidth = menu.value?.clientWidth - paddingLeft - paddingRight;

  let calcWidth = 0;
  let sliceIndex = 0;
  items.forEach((item, index) => {
    calcWidth += calcMenuItemWidth(item);
    if (calcWidth <= menuWidth - moreItemWidth) {
      sliceIndex = index + 1;
    }
  });
  return sliceIndex === items.length ? -1 : sliceIndex;
}

function debounce(fn: () => void, wait = 33.34) {
  let timer: null | ReturnType<typeof setTimeout>;
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn();
    }, wait);
  };
}

let isFirstTimeRender = true;
function handleResize() {
  if (sliceIndex.value === calcSliceIndex()) {
    return;
  }
  const callback = () => {
    sliceIndex.value = -1;
    nextTick(() => {
      sliceIndex.value = calcSliceIndex();
    });
  };
  callback();
  // // execute callback directly when first time resize to avoid shaking
  if (isFirstTimeRender) {
    callback();
  } else {
    debounce(callback)();
  }
  isFirstTimeRender = false;
}

function getActivePaths() {
  const activeItem = activePath.value && items.value[activePath.value];

  if (!activeItem || props.mode === "horizontal" || props.collapse) {
    return [];
  }

  return activeItem.parentPaths;
}

// 默认展开菜单
function initMenu() {
  const parentPaths = getActivePaths();

  // 展开该菜单项的路径上所有子菜单
  // expand all subMenus of the menu item
  parentPaths.forEach(path => {
    const subMenu = subMenus.value[path];
    if (subMenu) {
      openMenu(path, subMenu.parentPaths);
    }
  });
}

function updateActiveName(val: string) {
  const itemsInData = items.value;
  const item = itemsInData[val] || (activePath.value && itemsInData[activePath.value]) || itemsInData[props.defaultActive || ""];

  activePath.value = item ? item.path : val;
}

function handleMenuItemClick(data: MenuItemClicked) {
  const { collapse, mode } = props;
  if (mode === "horizontal" || collapse) {
    openedMenus.value = [];
  }
  const { parentPaths, path } = data;
  if (!path || !parentPaths) {
    return;
  }
  if (!isHttpUrl(path)) {
    activePath.value = path;
  }

  emit("select", path, parentPaths);
}

function handleSubMenuClick({ parentPaths, path }: MenuItemRegistered) {
  const isOpened = openedMenus.value.includes(path);

  if (isOpened) {
    closeMenu(path, parentPaths);
  } else {
    openMenu(path, parentPaths);
  }
}

function close(path: string) {
  const i = openedMenus.value.indexOf(path);

  if (i !== -1) {
    openedMenus.value.splice(i, 1);
  }
}

/**
 * 关闭、折叠菜单
 */
function closeMenu(path: string, parentPaths: string[]) {
  if (props.accordion) {
    openedMenus.value = subMenus.value[path]?.parentPaths ?? [];
  }

  close(path);

  emit("close", path, parentPaths);
}

/**
 * 点击展开菜单
 */
function openMenu(path: string, parentPaths: string[]) {
  if (openedMenus.value.includes(path)) {
    return;
  }
  // 手风琴模式菜单
  if (props.accordion) {
    const activeParentPaths = getActivePaths();
    if (activeParentPaths.includes(path)) {
      parentPaths = activeParentPaths;
    }
    openedMenus.value = openedMenus.value.filter((path: string) => parentPaths.includes(path));
  }
  openedMenus.value.push(path);
  emit("open", path, parentPaths);
}

function addMenuItem(item: MenuItemRegistered) {
  items.value[item.path] = item;
}

function addSubMenu(subMenu: MenuItemRegistered) {
  subMenus.value[subMenu.path] = subMenu;
}

function removeSubMenu(subMenu: MenuItemRegistered) {
  Reflect.deleteProperty(subMenus.value, subMenu.path);
}

function removeMenuItem(item: MenuItemRegistered) {
  Reflect.deleteProperty(items.value, item.path);
}
</script>
<template>
  <ul ref="menu" :class="[theme, b(), is(mode, true), is(theme, true), is('rounded', rounded), is('collapse', collapse), is('menu-align', mode === 'horizontal')]" :style="menuStyle" role="menu">
    <template v-if="mode === 'horizontal' && getSlot.showSlotMore">
      <template v-for="item in getSlot.slotDefault" :key="item.key">
        <component :is="item" />
      </template>
      <SubMenu is-sub-menu-more path="sub-menu-more">
        <template #title>
          <Ellipsis class="size-4" />
        </template>
        <template v-for="item in getSlot.slotMore" :key="item.key">
          <component :is="item" />
        </template>
      </SubMenu>
    </template>
    <template v-else>
      <slot></slot>
    </template>
  </ul>
</template>

<style lang="less">
.menu-item-active() {
  color: var(--menu-item-active-color);
  text-decoration: none;
  cursor: pointer;
  background: var(--menu-item-active-background-color);
}

.menu-item() {
  position: relative;
  display: flex;
  // gap: 12px;
  align-items: center;
  height: var(--menu-item-height);
  padding: var(--menu-item-padding-y) var(--menu-item-padding-x);
  margin: 0 var(--menu-item-margin-x) var(--menu-item-margin-y) var(--menu-item-margin-x);
  font-size: var(--menu-font-size);
  color: var(--menu-item-color);
  text-decoration: none;
  white-space: nowrap;
  list-style: none;
  cursor: pointer;
  background: var(--menu-item-background-color);
  border: none;
  border-radius: var(--menu-item-radius);
  transition:
    background 0.15s ease,
    color 0.15s ease,
    padding 0.15s ease,
    border-color 0.15s ease;

  &.is-disabled {
    cursor: not-allowed;
    background: none !important;
    opacity: 0.25;
  }

  .vben-menu__icon {
    transition: transform 0.25s;
  }

  &:hover {
    .vben-menu__icon {
      transform: scale(1.2);
    }
  }

  &:hover,
  &:focus {
    outline: none;
  }

  * {
    vertical-align: bottom;
  }
}

.menu-title() {
  max-width: var(--menu-title-width);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 1;
}

.is-menu-align {
  justify-content: var(--menu-align, start);
}
.vben-menu__popup-container {
  padding: 0px !important;
}

.vben-menu__popup-container,
.vben-menu {
  --menu-title-width: 140px;
  --menu-item-icon-size: 16px;
  --menu-item-height: 38px;
  --menu-item-padding-y: 21px;
  --menu-item-padding-x: 12px;
  --menu-item-popup-padding-y: 20px;
  --menu-item-popup-padding-x: 12px;
  --menu-item-margin-y: 2px;
  --menu-item-margin-x: 0px;
  --menu-item-collapse-padding-y: 23.5px;
  --menu-item-collapse-padding-x: 0px;
  --menu-item-collapse-margin-y: 4px;
  --menu-item-collapse-margin-x: 0px;
  --menu-item-radius: 0px;
  --menu-item-indent: 16px;
  --menu-font-size: 14px;

  &.is-dark {
    --menu-background-color: hsl(var(--menu));
    // --menu-submenu-opened-background-color: hsl(var(--menu-opened-dark));
    --menu-item-background-color: var(--menu-background-color);
    --menu-item-color: hsl(var(--foreground) / 80%);
    --menu-item-hover-color: hsl(var(--accent-foreground));
    --menu-item-hover-background-color: hsl(var(--accent));
    --menu-item-active-color: hsl(var(--accent-foreground));
    --menu-item-active-background-color: hsl(var(--accent));
    --menu-submenu-hover-color: hsl(var(--foreground));
    --menu-submenu-hover-background-color: hsl(var(--accent));
    --menu-submenu-active-color: hsl(var(--foreground));
    --menu-submenu-active-background-color: transparent;
    --menu-submenu-background-color: var(--menu-background-color);
  }

  &.is-light {
    --menu-background-color: hsl(var(--menu));
    // --menu-submenu-opened-background-color: hsl(var(--menu-opened));
    --menu-item-background-color: var(--menu-background-color);
    --menu-item-color: hsl(var(--foreground));
    --menu-item-hover-color: var(--menu-item-color);
    --menu-item-hover-background-color: hsl(var(--accent));
    --menu-item-active-color: hsl(var(--primary));
    --menu-item-active-background-color: hsl(var(--primary) / 15%);
    --menu-submenu-hover-color: hsl(var(--primary));
    --menu-submenu-hover-background-color: hsl(var(--accent));
    --menu-submenu-active-color: hsl(var(--primary));
    --menu-submenu-active-background-color: transparent;
    --menu-submenu-background-color: var(--menu-background-color);
  }

  &.is-rounded {
    --menu-item-margin-x: 8px;
    --menu-item-collapse-margin-x: 6px;
    --menu-item-radius: 8px;
  }

  &.is-horizontal:not(.is-rounded) {
    --menu-item-height: 40px;
    --menu-item-radius: 6px;
  }

  &.is-horizontal.is-rounded {
    --menu-item-height: 40px;
    --menu-item-radius: 6px;
    --menu-item-padding-x: 12px;
  }

  // .vben-menu__popup,
  &.is-horizontal {
    --menu-item-padding-y: 0px;
    --menu-item-padding-x: 10px;
    --menu-item-margin-y: 0px;
    --menu-item-margin-x: 1px;
    --menu-background-color: transparent;

    &.is-dark {
      --menu-item-hover-color: hsl(var(--accent-foreground));
      --menu-item-hover-background-color: hsl(var(--accent));
      --menu-item-active-color: hsl(var(--accent-foreground));
      --menu-item-active-background-color: hsl(var(--accent));
      --menu-submenu-active-color: hsl(var(--foreground));
      --menu-submenu-active-background-color: hsl(var(--accent));
      --menu-submenu-hover-color: hsl(var(--accent-foreground));
      --menu-submenu-hover-background-color: hsl(var(--accent));
    }

    &.is-light {
      --menu-item-active-color: hsl(var(--primary));
      --menu-item-active-background-color: hsl(var(--primary) / 15%);
      --menu-item-hover-background-color: hsl(var(--accent));
      --menu-item-hover-color: hsl(var(--primary));
      --menu-submenu-active-color: hsl(var(--primary));
      --menu-submenu-active-background-color: hsl(var(--primary) / 15%);
      --menu-submenu-hover-color: hsl(var(--primary));
      --menu-submenu-hover-background-color: hsl(var(--accent));
    }
  }
}

.vben-menu {
  position: relative;
  box-sizing: border-box;
  padding-left: 0;
  margin: 0;
  list-style: none;
  background: hsl(var(--menu-background-color));

  // 垂直菜单
  &.is-vertical {
    &:not(.vben-menu.is-collapse) {
      & .vben-menu-item,
      & .vben-sub-menu-content,
      & .vben-menu-item-group__title {
        padding-left: calc(var(--menu-item-indent) + var(--menu-level) * var(--menu-item-indent));
        white-space: nowrap;
      }

      & > .vben-sub-menu {
        & > .vben-menu {
          & > .vben-menu-item {
            padding-left: calc(0px + var(--menu-item-indent) + var(--menu-level) * var(--menu-item-indent));
          }
        }

        & > .vben-sub-menu-content {
          padding-left: calc(var(--menu-item-indent) - 8px);
        }
      }
      & > .vben-menu-item {
        padding-left: calc(var(--menu-item-indent) - 8px);
      }
    }
  }

  &.is-horizontal {
    display: flex;
    flex-wrap: nowrap;
    max-width: 100%;
    height: var(--height-horizontal-height);
    border-right: none;

    .vben-menu-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: var(--menu-item-height);
      padding-right: calc(var(--menu-item-padding-x) + 6px);
      margin: 0;
      margin-right: 2px;
      // border-bottom: 2px solid transparent;
      border-radius: var(--menu-item-radius);
    }

    & > .vben-sub-menu {
      height: var(--menu-item-height);
      margin-right: 2px;

      &:focus,
      &:hover {
        outline: none;
      }

      & .vben-sub-menu-content {
        height: 100%;
        padding-right: 40px;
        // border-bottom: 2px solid transparent;
        border-radius: var(--menu-item-radius);
      }
    }

    & .vben-menu-item:not(.is-disabled):hover,
    & .vben-menu-item:not(.is-disabled):focus {
      outline: none;
    }

    & > .vben-menu-item.is-active {
      color: var(--menu-item-active-color);
    }

    // &.is-light {
    //   & > .vben-sub-menu {
    //     &.is-active {
    //       border-bottom: 2px solid var(--menu-item-active-color);
    //     }
    //     &:not(.is-active) .vben-sub-menu-content {
    //       &:hover {
    //         border-bottom: 2px solid var(--menu-item-active-color);
    //       }
    //     }
    //   }
    //   & > .vben-menu-item.is-active {
    //     border-bottom: 2px solid var(--menu-item-active-color);
    //   }

    //   & .vben-menu-item:not(.is-disabled):hover,
    //   & .vben-menu-item:not(.is-disabled):focus {
    //     border-bottom: 2px solid var(--menu-item-active-color);
    //   }
    // }
  }
  // 折叠菜单

  &.is-collapse {
    .vben-menu__icon {
      margin-right: 0;
    }
    .vben-sub-menu__icon-arrow {
      display: none;
    }

    .vben-sub-menu-content,
    .vben-menu-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--menu-item-collapse-padding-y) var(--menu-item-collapse-padding-x);
      margin: var(--menu-item-collapse-margin-y) var(--menu-item-collapse-margin-x);
      transition: all 0.3s;

      &.is-active {
        background: var(--menu-item-active-background-color) !important;
        border-radius: var(--menu-item-radius);
      }
    }

    &.is-light {
      .vben-sub-menu-content,
      .vben-menu-item {
        &.is-active {
          // color: hsl(var(--primary-foreground)) !important;
          background: var(--menu-item-active-background-color) !important;
        }
      }
    }

    &.is-rounded {
      .vben-sub-menu-content,
      .vben-menu-item {
        &.is-collapse-show-title {
          // padding: 32px 0 !important;
          margin: 4px 8px !important;
        }
      }
    }
  }

  &__popup-container {
    max-width: 240px;
    height: unset;
    padding: 0;
    background: var(--menu-background-color);
  }

  &__popup {
    padding: 10px 0;
    border-radius: var(--menu-item-radius);

    .vben-sub-menu-content,
    .vben-menu-item {
      padding: var(--menu-item-popup-padding-y) var(--menu-item-popup-padding-x);
    }
  }

  &__icon {
    flex-shrink: 0;
    width: var(--menu-item-icon-size);
    height: var(--menu-item-icon-size);
    margin-right: 8px;
    text-align: center;
    vertical-align: middle;
  }
}

.vben-menu-item {
  fill: var(--menu-item-color);

  .menu-item();

  &.is-active {
    fill: var(--menu-item-active-color);

    .menu-item-active();
  }

  &__content {
    display: inline-flex;
    align-items: center;
    width: 100%;
    height: var(--menu-item-height);

    span {
      .menu-title();
    }
  }

  &.is-collapse-show-title {
    padding: 32px 0 !important;
    // margin: 4px 8px !important;
    .vben-menu-tooltip__trigger {
      flex-direction: column;
    }
    .vben-menu__icon {
      display: block;
      font-size: 20px !important;
      transition: all 0.25s ease;
    }

    .vben-menu__name {
      display: inline-flex;
      margin-top: 8px;
      margin-bottom: 0;
      font-size: 12px;
      font-weight: 400;
      line-height: normal;
      transition: all 0.25s ease;
    }
  }

  &:not(.is-active):hover {
    color: var(--menu-item-hover-color);
    text-decoration: none;
    cursor: pointer;
    background: var(--menu-item-hover-background-color) !important;
  }

  .vben-menu-tooltip__trigger {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 0 var(--menu-item-padding-x);
    font-size: var(--menu-font-size);
    line-height: var(--menu-item-height);
  }
}

.vben-sub-menu {
  padding-left: 0;
  margin: 0;
  list-style: none;
  background: var(--menu-submenu-background-color);
  fill: var(--menu-item-color);

  &.is-active {
    div[data-state="open"] > .vben-sub-menu-content,
    > .vben-sub-menu-content {
      // font-weight: 500;
      color: var(--menu-submenu-active-color);
      text-decoration: none;
      cursor: pointer;
      background: var(--menu-submenu-active-background-color);
      fill: var(--menu-submenu-active-color);
    }
  }
}

.vben-sub-menu-content {
  height: var(--menu-item-height);

  .menu-item();

  &__icon-arrow {
    position: absolute;
    top: 50%;
    right: 10px;
    width: inherit;
    margin-top: -8px;
    margin-right: 0;
    // font-size: 16px;
    font-weight: normal;
    opacity: 1;
    transition: transform 0.25s ease;
  }

  &__title {
    .menu-title();
  }

  &.is-collapse-show-title {
    flex-direction: column;
    padding: 32px 0 !important;
    // margin: 4px 8px !important;
    .vben-menu__icon {
      display: block;
      font-size: 20px !important;
      transition: all 0.25s ease;
    }
    .vben-sub-menu-content__title {
      display: inline-flex;
      flex-shrink: 0;
      margin-top: 8px;
      margin-bottom: 0;
      font-size: 12px;
      font-weight: 400;
      line-height: normal;
      transition: all 0.25s ease;
    }
  }

  &.is-more {
    padding-right: 12px !important;
  }

  // &:not(.is-active):hover {
  &:hover {
    color: var(--menu-submenu-hover-color);
    text-decoration: none;
    cursor: pointer;
    background: var(--menu-submenu-hover-background-color) !important;

    // svg {
    //   fill: var(--menu-submenu-hover-color);
    // }
  }
}
</style>
