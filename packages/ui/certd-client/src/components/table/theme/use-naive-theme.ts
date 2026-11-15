import { computed, unref, watch, type MaybeRefOrGetter } from "vue";
import { applyFnThemeTokens } from "./index";
import { mapNaiveThemeToFnTokens } from "./naive";

type NaiveThemeTokens = Parameters<typeof mapNaiveThemeToFnTokens>[0];

export function useNaiveTheme(tokens: MaybeRefOrGetter<NaiveThemeTokens>): void {
  const fnTokens = computed(() => mapNaiveThemeToFnTokens(unref(typeof tokens === "function" ? tokens() : tokens)));

  watch(fnTokens, value => applyFnThemeTokens(value), { deep: true, immediate: true });
}
