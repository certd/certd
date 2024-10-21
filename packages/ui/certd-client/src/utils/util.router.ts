import router from "/@/router";

async function open(path: any) {
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

export const routerUtils = {
  open
};
