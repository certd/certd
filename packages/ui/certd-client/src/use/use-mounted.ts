import { onActivated, onMounted } from "vue";

/**
 * 可靠的页面刷新钩子：
 * - 如果组件实际被 KeepAlive 缓存命中，由 onActivated 触发 init；
 * - 如果没有被缓存，由 onMounted 兜底触发，避免不刷新也不触发 onActivated。
 */
export function useMounted(init: () => void | Promise<void>) {
  let activated = false;

  onActivated(() => {
    activated = true;
    init();
  });

  onMounted(() => {
    // 让 onActivated 有机会先执行；组件未被 KeepAlive 缓存时 onActivated 不会触发，由这里兜底。
    setTimeout(() => {
      if (!activated) {
        init();
      }
    });
  });
}
