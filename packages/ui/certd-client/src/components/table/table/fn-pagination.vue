<template>
  <nav v-if="show !== false" class="fn-pagination" aria-label="分页" :style="paginationStyle">
    <div class="fn-pagination-summary">
      <span>{{ showTotal(total || 0) }}</span>
    </div>
    <div class="fn-pagination-controls">
      <button class="fn-pagination-arrow" type="button" aria-label="上一页" :disabled="activePage <= 1" @click="changePage(activePage - 1, pageSize)">
        <ChevronLeft :size="15" />
      </button>
      <template v-if="simple">
        <span class="fn-pagination-simple">{{ activePage }} <i>/</i> {{ pageCount }}</span>
      </template>
      <template v-else>
        <template v-for="(item, index) in pageItems" :key="`${item}-${index}`">
          <span v-if="item === 'ellipsis'" class="fn-pagination-ellipsis" aria-hidden="true">...</span>
          <button
            v-else
            class="fn-pagination-page"
            :class="{ active: item === activePage }"
            type="button"
            :aria-label="`第 ${item} 页`"
            :aria-current="item === activePage ? 'page' : undefined"
            @click="changePage(item, pageSize)"
          >
            {{ item }}
          </button>
        </template>
      </template>
      <button class="fn-pagination-arrow" type="button" aria-label="下一页" :disabled="activePage >= pageCount" @click="changePage(activePage + 1, pageSize)">
        <ChevronRight :size="15" />
      </button>
    </div>
    <div class="fn-pagination-options">
      <label v-if="showSizeChanger" class="fn-pagination-size">
        <select aria-label="每页条数" :value="pageSize" @change="changePageSize(($event.target as HTMLSelectElement).value)">
          <option v-for="option in pageSizeOptions" :key="option" :value="Number(option)">{{ option }} 条/页</option>
        </select>
        <ChevronDown :size="13" />
      </label>
      <form v-if="showQuickJumper" class="fn-pagination-jump" @submit.prevent="submitJump">
        <span>跳至</span>
        <input v-model="jumpInput" type="number" min="1" :max="pageCount" aria-label="跳转到页码" @keyup.enter="submitJump" />
        <span>页</span>
      </form>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, ChevronLeft, ChevronRight } from "@lucide/vue";
import type { CSSProperties } from "vue";
import type { FnPaginationProps } from "../types/index";

const props = withDefaults(defineProps<FnPaginationProps>(), {
  show: true,
  current: 1,
  pageSize: 10,
  pageSizeOptions: () => ["10", "20", "50", "100"],
  simple: false,
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: (total: number) => `共 ${total} 条`,
});
const emit = defineEmits<{ change: [current: number, pageSize: number] }>();

const total = computed(() => Math.max(0, props.total || 0));
const pageSize = computed(() => Math.max(1, props.pageSize));
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const activePage = computed(() => Math.min(Math.max(1, props.current), pageCount.value));
const pageItems = computed<Array<number | "ellipsis">>(() => {
  if (pageCount.value <= 7) {
    return Array.from({ length: pageCount.value }, (_value, index) => index + 1);
  }
  if (activePage.value <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", pageCount.value];
  }
  if (activePage.value >= pageCount.value - 3) {
    return [1, "ellipsis", pageCount.value - 4, pageCount.value - 3, pageCount.value - 2, pageCount.value - 1, pageCount.value];
  }
  return [1, "ellipsis", activePage.value - 1, activePage.value, activePage.value + 1, "ellipsis", pageCount.value];
});
const paginationStyle = computed<CSSProperties>(() => (props.primaryColor ? ({ "--fn-pagination-primary": props.primaryColor } as CSSProperties) : {}));
const jumpInput = ref("");

function changePage(current: number, nextPageSize: number): void {
  const nextPage = Math.min(Math.max(1, current), Math.max(1, Math.ceil(total.value / nextPageSize)));
  emit("change", nextPage, nextPageSize);
}
function changePageSize(value: string): void {
  const nextPageSize = Number(value);
  if (Number.isFinite(nextPageSize) && nextPageSize > 0) {
    emit("change", 1, nextPageSize);
  }
}
function jumpToPage(value: number): void {
  if (Number.isInteger(value) && value >= 1 && value <= pageCount.value) {
    changePage(value, pageSize.value);
  }
}
function submitJump(): void {
  jumpToPage(Number(jumpInput.value));
  jumpInput.value = "";
}
</script>

<style lang="less">
.fn-pagination {
  --fn-pagination-primary: var(--fn-color-primary);
  display: flex;
  background-color: var(--fn-color-bg-container);
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  min-height: 36px;
  color: var(--fn-color-text-secondary);
  font-size: 13px;
  .fn-pagination-summary,
  .fn-pagination-controls,
  .fn-pagination-options,
  .fn-pagination-size,
  .fn-pagination-jump {
    display: inline-flex;
    align-items: center;
  }
  .fn-pagination-summary {
    gap: 9px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .fn-pagination-controls {
    flex: 0 0 auto;
    gap: 4px;
  }
  button {
    font: inherit;
  }
  .fn-pagination-arrow,
  .fn-pagination-page {
    display: inline-flex;
    width: 30px;
    height: 30px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    color: inherit;
    background: transparent;
    cursor: pointer;
    transition:
      color 140ms ease,
      background-color 140ms ease,
      border-color 140ms ease;
    &:hover:not(:disabled) {
      color: var(--fn-pagination-primary);
      background: color-mix(in srgb, var(--fn-pagination-primary) 9%, transparent);
    }
    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--fn-pagination-primary) 45%, transparent);
      outline-offset: 1px;
    }
    &:disabled {
      color: var(--fn-color-text-quaternary);
      cursor: not-allowed;
    }
  }
  .fn-pagination-page.active {
    border-color: var(--fn-pagination-primary);
    color: #fff;
    background: var(--fn-pagination-primary);
    box-shadow: 0 2px 6px color-mix(in srgb, var(--fn-pagination-primary) 26%, transparent);
  }
  .fn-pagination-ellipsis {
    width: 20px;
    text-align: center;
    color: var(--fn-color-text-tertiary);
  }
  .fn-pagination-simple {
    min-width: 58px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    i {
      margin: 0 4px;
      color: var(--fn-color-text-quaternary);
      font-style: normal;
    }
  }
  .fn-pagination-options {
    gap: 10px;
  }
  .fn-pagination-size {
    position: relative;
    select {
      height: 30px;
      appearance: none;
      padding: 0 26px 0 9px;
      border: 1px solid var(--fn-color-border);
      border-radius: var(--fn-border-radius);
      color: inherit;
      background: transparent;
      cursor: pointer;
      font: inherit;
      outline: none;
      &:focus-visible {
        border-color: var(--fn-pagination-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--fn-pagination-primary) 16%, transparent);
      }
    }
    svg {
      position: absolute;
      right: 8px;
      pointer-events: none;
    }
  }
  .fn-pagination-jump {
    gap: 5px;
    white-space: nowrap;
    input {
      width: 42px;
      height: 30px;
      box-sizing: border-box;
      padding: 0 5px;
      border: 1px solid var(--fn-color-border);
      border-radius: var(--fn-border-radius);
      color: inherit;
      background: transparent;
      text-align: center;
      font: inherit;
    }
  }
  .dark & {
    .fn-pagination-arrow:disabled {
      color: var(--fn-color-text-quaternary);
    }
  }
  @media (max-width: 640px) {
    flex-wrap: wrap;
    justify-content: center;
    .fn-pagination-summary {
      flex: 1 1 100%;
      justify-content: center;
    }
    .fn-pagination-options {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
}
</style>
