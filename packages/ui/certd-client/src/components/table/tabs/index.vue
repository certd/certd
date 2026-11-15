<template>
  <div ref="tabListRef" class="fn-tabs" role="tablist">
    <FnRender v-if="slots?.before" :render="slots.before" :ctx="{ tabs, modelValue }" />
    <button v-for="item in tabs" :key="item.value" type="button" class="fn-tabs-item" :class="{ active: modelValue === item.value }" role="tab" :aria-selected="modelValue === item.value" @click="selectTab(item.value)">
      <FnRender v-if="slots?.item" :render="slots.item" :ctx="{ item, active: modelValue === item.value }" />
      <template v-else
        >{{ item.label }}<span v-if="showCount" class="fn-tabs-count">{{ item.count || 0 }}</span></template
      >
    </button>
    <FnRender v-if="slots?.after" :render="slots.after" :ctx="{ tabs, modelValue }" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import FnRender from "../components/fn-render";
const props = defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: String,
    default: "",
  },
  showCount: {
    type: Boolean,
    default: true,
  },
  slots: { type: Object, default: () => ({}) },
});
const slots = props.slots;

const emit = defineEmits(["update:modelValue"]);
const tabListRef = ref<HTMLElement>();

function selectTab(value: string): void {
  emit("update:modelValue", value);
}

function scrollActiveTabIntoView(): void {
  const tabList = tabListRef.value;
  if (!tabList) {
    return;
  }
  const activeTab = tabList.querySelector<HTMLElement>(".fn-tabs-item.active");
  activeTab?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

onMounted(() => {
  scrollActiveTabIntoView();
});
watch(
  () => props.modelValue,
  async () => {
    await nextTick();
    scrollActiveTabIntoView();
  }
);
</script>

<style lang="less">
.fn-tabs {
  display: flex;
  min-width: 0;
  flex: 1;
  gap: 24px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .fn-tabs-item {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 1px;
    border: 0;
    color: var(--fn-color-text-tertiary);
    background: transparent;
    font-size: 13px;
    white-space: nowrap;
    cursor: pointer;

    &.active {
      color: var(--fn-color-text);
      font-weight: 600;

      &::after {
        position: absolute;
        right: 0;
        bottom: -1px;
        left: 0;
        height: 2px;
        background: var(--fn-color-primary);
        content: "";
      }
    }
  }

  .fn-tabs-count {
    margin-left: 5px;
    color: var(--fn-color-text-quaternary);
    font-size: 11px;
  }

  .dark & {
    .fn-tabs-item.active {
      color: var(--fn-color-text);
    }

    .fn-tabs-item.active .fn-tabs-count {
      color: var(--fn-color-text-secondary);
    }
  }
}
</style>
