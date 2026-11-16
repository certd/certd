<template>
  <FnDrawer v-model:open="open" title="列设置" :width="460">
    <div class="fn-column-settings-content">
      <div class="fn-column-settings-list">
        <div class="fn-column-settings-list-header">
          <label class="fn-column-settings-select-all">
            <input :ref="setSelectAllRef" :checked="allVisible" type="checkbox" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
            <span>{{ visibleCount }} / {{ rows.length }}</span>
          </label>
          <span class="fn-column-settings-label">固定 / 排序</span>
        </div>
        <div
          v-for="(column, index) in rows"
          :key="column.key"
          class="fn-column-settings-row"
          :class="{ 'is-dragging': draggingKey === column.key, 'is-over': overKey === column.key }"
          @dragover.prevent="overKey = column.key"
          @drop.prevent="dropColumn(column.key)"
        >
          <label class="fn-column-settings-name">
            <input v-model="column.show" type="checkbox" @change="emitChange" />
            <span :title="column.title">{{ column.title }}</span>
          </label>
          <div class="fn-column-settings-actions">
            <div class="fn-column-settings-fixed" role="group" :aria-label="`${column.title}固定位置`">
              <button type="button" :class="{ active: column.fixed === 'left' }" :aria-label="`${column.title}固定到左侧`" :aria-pressed="column.fixed === 'left'" title="固定到左侧" @click="setFixed(column, 'left')">
                <ChevronLeft :size="16" />
              </button>
              <button type="button" :class="{ active: !column.fixed }" :aria-label="`${column.title}取消固定`" :aria-pressed="!column.fixed" title="取消固定" @click="setFixed(column, undefined)">
                <X :size="16" />
              </button>
              <button type="button" :class="{ active: column.fixed === 'right' }" :aria-label="`${column.title}固定到右侧`" :aria-pressed="column.fixed === 'right'" title="固定到右侧" @click="setFixed(column, 'right')">
                <ChevronRight :size="16" />
              </button>
            </div>
            <button
              class="fn-column-settings-grip"
              type="button"
              draggable="true"
              :aria-label="`拖动排序：${column.title}`"
              title="拖动排序"
              @dragstart="startDrag($event, column.key)"
              @dragend="clearDrag"
              @keydown="moveWithKeyboard($event, index)"
            >
              <GripVertical :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="fn-column-settings-footer">
        <button class="fn-column-settings-reset" type="button" @click="emit('reset')"><RotateCcw :size="16" />还原</button>
        <FnButton class="fn-column-settings-confirm" type="primary" text="确定" :icon="Check" @click="open = false" />
      </div>
    </template>
  </FnDrawer>
</template>

<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, GripVertical, RotateCcw, X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import FnButton from "./fn-button.vue";
import FnDrawer from "./fn-drawer.vue";
import type { FnColumnSettingsColumn } from "../types/index";

const props = defineProps<{ modelValue: boolean; columns: FnColumnSettingsColumn[] }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean]; change: [columns: FnColumnSettingsColumn[]]; reset: [] }>();
const open = computed({ get: () => props.modelValue, set: value => emit("update:modelValue", value) });
const rows = ref<FnColumnSettingsColumn[]>([]);
const draggingKey = ref<string>();
const overKey = ref<string>();
const selectAllInput = ref<HTMLInputElement>();
const visibleCount = computed(() => rows.value.filter(column => column.show).length);
const allVisible = computed(() => rows.value.length > 0 && visibleCount.value === rows.value.length);
const someVisible = computed(() => visibleCount.value > 0);

watch(
  () => props.columns,
  columns => {
    rows.value = columns.map(column => ({ ...column }));
  },
  { immediate: true, deep: true }
);
watch(
  [allVisible, someVisible],
  () => {
    if (selectAllInput.value) {
      selectAllInput.value.indeterminate = someVisible.value && !allVisible.value;
    }
  },
  { flush: "post", immediate: true }
);

function setSelectAllRef(element: Element | null): void {
  selectAllInput.value = (element as HTMLInputElement | null) || undefined;
}

function emitChange(): void {
  emit(
    "change",
    rows.value.map(column => ({ ...column }))
  );
}

function toggleAll(visible: boolean): void {
  for (const column of rows.value) {
    column.show = visible;
  }
  emitChange();
}

function setFixed(column: FnColumnSettingsColumn, fixed: "left" | "right" | undefined): void {
  const oldFixed = column.fixed;
  const oldIndex = rows.value.findIndex(item => item.key === column.key);
  column.fixed = fixed;
  const [movingColumn] = rows.value.splice(oldIndex, 1);

  if (fixed === "right") {
    const firstRightIndex = rows.value.findIndex(item => item.fixed === "right");
    rows.value.splice(firstRightIndex < 0 ? rows.value.length : firstRightIndex, 0, movingColumn);
  } else if (fixed === "left") {
    const firstNonLeftIndex = rows.value.findIndex(item => item.fixed !== "left");
    rows.value.splice(firstNonLeftIndex < 0 ? rows.value.length : firstNonLeftIndex, 0, movingColumn);
  } else if (oldFixed === "right") {
    const firstRightIndex = rows.value.findIndex(item => item.fixed === "right");
    rows.value.splice(firstRightIndex < 0 ? oldIndex : firstRightIndex, 0, movingColumn);
  } else {
    rows.value.splice(oldIndex, 0, movingColumn);
  }
  emitChange();
}

function startDrag(event: DragEvent, key: string): void {
  draggingKey.value = key;
  event.dataTransfer?.setData("text/plain", key);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function dropColumn(targetKey: string): void {
  const sourceKey = draggingKey.value;
  if (!sourceKey || sourceKey === targetKey) {
    clearDrag();
    return;
  }
  const sourceIndex = rows.value.findIndex(column => column.key === sourceKey);
  const targetIndex = rows.value.findIndex(column => column.key === targetKey);
  if (sourceIndex < 0 || targetIndex < 0) {
    clearDrag();
    return;
  }
  const sourceColumn = rows.value[sourceIndex];
  const targetColumn = rows.value[targetIndex];

  if ((sourceColumn.fixed === "right" || targetColumn.fixed === "right") && (sourceColumn.fixed !== "right" || targetColumn.fixed !== "right")) {
    clearDrag();
    return;
  }

  if (sourceColumn.fixed === "right") {
    const rightPositions = rows.value.map((column, index) => (column.fixed === "right" ? index : -1)).filter(index => index >= 0);
    const rightColumns = rightPositions.map(index => rows.value[index]);
    const sourceGroupIndex = rightColumns.findIndex(column => column.key === sourceKey);
    const [movingColumn] = rightColumns.splice(sourceGroupIndex, 1);
    const targetGroupIndex = rightColumns.findIndex(column => column.key === targetKey);
    rightColumns.splice(targetGroupIndex, 0, movingColumn);
    const reorderedRows = [...rows.value];
    for (let index = 0; index < rightPositions.length; index++) {
      reorderedRows[rightPositions[index]] = rightColumns[index];
    }
    rows.value = reorderedRows;
    clearDrag();
    emitChange();
    return;
  }

  rows.value.splice(sourceIndex, 1);

  let insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  if (sourceColumn.fixed === "left" && targetColumn.fixed === "left") {
    const firstLeftIndex = rows.value.findIndex(column => column.fixed === "left");
    if (targetColumn.key === rows.value[firstLeftIndex]?.key && firstLeftIndex >= 0) {
      insertIndex = firstLeftIndex + 1;
    }
  }
  rows.value.splice(insertIndex, 0, sourceColumn);
  clearDrag();
  emitChange();
}

function moveWithKeyboard(event: KeyboardEvent, index: number): void {
  if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const targetIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= rows.value.length) {
    return;
  }
  const [column] = rows.value.splice(index, 1);
  rows.value.splice(targetIndex, 0, column);
  emitChange();
}

function clearDrag(): void {
  draggingKey.value = undefined;
  overKey.value = undefined;
}
</script>

<style lang="less">
.fn-column-settings-content {
  padding: 28px 22px 18px;
  font-size: 14px;
}

.fn-column-settings-list {
  overflow: hidden;
  border: 1px solid var(--fn-color-border-secondary);
  border-radius: 8px;
  background: var(--fn-color-bg-container);
}

.fn-column-settings-list-header,
.fn-column-settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 158px;
  align-items: center;
  column-gap: 12px;
}

.fn-column-settings-list-header {
  min-height: 48px;
  padding: 0 14px;
  color: var(--fn-color-text-secondary);
  font-size: 13px;
}

.fn-column-settings-select-all,
.fn-column-settings-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  input {
    position: relative;
    width: 18px;
    height: 18px;
    flex: none;
    appearance: none;
    border: 1px solid var(--fn-color-border);
    border-radius: 6px;
    background: var(--fn-color-bg-container);
    cursor: pointer;
    &:checked {
      border-color: var(--fn-color-primary);
      background: var(--fn-color-primary);
    }
    &:checked::after {
      position: absolute;
      top: 2px;
      left: 5px;
      width: 5px;
      height: 9px;
      border: solid #fff;
      border-width: 0 2px 2px 0;
      content: "";
      transform: rotate(45deg);
    }
    &:indeterminate {
      border-color: var(--fn-color-primary);
      background: var(--fn-color-primary);
    }
    &:indeterminate::after {
      position: absolute;
      top: 7px;
      right: 3px;
      left: 3px;
      height: 2px;
      background: #fff;
      content: "";
    }
    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--fn-color-primary) 50%, transparent);
      outline-offset: 2px;
    }
  }
}

.fn-column-settings-select-all {
  gap: 12px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.fn-column-settings-label {
  text-align: center;
  white-space: nowrap;
}

.fn-column-settings-row {
  min-height: 46px;
  padding: 0 8px 0 14px;
  transition: background-color 120ms ease;
  &.is-over {
    background: color-mix(in srgb, var(--fn-color-primary) 9%, transparent);
  }
  &.is-dragging {
    opacity: 0.45;
  }
}

.fn-column-settings-name {
  overflow: hidden;
  span {
    overflow: hidden;
    color: var(--fn-color-text);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.fn-column-settings-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.fn-column-settings-fixed {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--fn-color-border);
  border-radius: 7px;
  button {
    display: inline-flex;
    width: 25px;
    height: 25px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-right: 1px solid var(--fn-color-border-secondary);
    color: var(--fn-color-text-secondary);
    background: transparent;
    cursor: pointer;
    &:last-child {
      border-right: 0;
    }
    &:hover:not(.active) {
      background: var(--fn-color-fill-secondary);
    }
    &.active {
      color: #fff;
      background: var(--fn-color-primary);
    }
    &:focus-visible {
      position: relative;
      z-index: 1;
      outline: 2px solid var(--fn-color-primary);
      outline-offset: -2px;
    }
  }
}

.fn-column-settings-grip {
  display: inline-flex;
  width: 28px;
  height: 36px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 5px;
  color: var(--fn-color-text-tertiary);
  background: transparent;
  cursor: grab;
  &:hover {
    color: var(--fn-color-text);
    background: var(--fn-color-fill-secondary);
  }
  &:active {
    cursor: grabbing;
  }
  &:focus-visible {
    outline: 2px solid var(--fn-color-primary);
  }
}

.fn-column-settings-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.fn-column-settings-reset {
  display: inline-flex;
  min-width: 0;
  height: 40px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--fn-color-border);
  border-radius: 7px;
  color: var(--fn-color-text);
  background: var(--fn-color-bg-container);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  &:hover {
    border-color: var(--fn-color-primary);
    color: var(--fn-color-primary);
  }
  &:focus-visible {
    outline: 2px solid var(--fn-color-primary);
    outline-offset: 2px;
  }
}

.fn-column-settings-confirm {
  flex: 1;
  .fn-button {
    width: 100%;
    min-height: 40px;
  }
}

@media (max-width: 460px) {
  .fn-column-settings-list-header,
  .fn-column-settings-row {
    grid-template-columns: minmax(0, 1fr) 148px;
    column-gap: 4px;
  }
  .fn-column-settings-content {
    padding-right: 12px;
    padding-left: 12px;
  }
}
</style>
