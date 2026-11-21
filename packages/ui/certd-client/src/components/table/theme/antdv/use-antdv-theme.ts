import { computed, unref, watch, type MaybeRefOrGetter } from "vue";
import { applyFnThemeTokens } from "..";
import { mapAntdvThemeToFnTokens } from "./antdv";

type AntdvThemeTokens = Parameters<typeof mapAntdvThemeToFnTokens>[0];

export function useAntdvTheme(tokens: MaybeRefOrGetter<AntdvThemeTokens>): void {
  const fnTokens = computed(() => mapAntdvThemeToFnTokens(unref(typeof tokens === "function" ? tokens() : tokens)));

  watch(fnTokens, value => applyFnThemeTokens(value), { deep: true, immediate: true });
}
