<script setup lang="ts">
import { dict } from "@fast-crud/fast-crud";

const props = defineProps<{ value: any }>();

const emits = defineEmits(["set", "clear"]);
function setValue() {
  emits("set");
}
function clearValue() {
  emits("clear");
}

const switchDict = dict({
  data: [
    {
      value: true,
      label: "自定义",
    },
    {
      value: false,
      label: "原始值",
    },
  ],
});

function onSwitchChange(value: boolean) {
  if (value) {
    setValue();
  } else {
    clearValue();
  }
}
</script>

<template>
  <div class="rollbackable">
    <div class="flex">
      <div style="width: 100px">
        <!-- <a-tag v-if="value === undefined" color="green" size="small" class="pointer flex-inline items-center" @click.stop="setValue">
          <fs-icon icon="material-symbols:edit" class="mr-5"></fs-icon>
          自定义
        </a-tag>
        <a-tag v-else color="red" size="small" class="pointer flex-inline items-center" @click.stop="clearValue">
          <fs-icon icon="material-symbols:undo" class="mr-5"></fs-icon>
          还原
        </a-tag> -->
        <fs-dict-switch :checked="value !== undefined" :dict="switchDict" @change="onSwitchChange" />
      </div>
      <div class="flex-1 overflow-hidden value-render">
        <slot v-if="value === undefined" name="default"></slot>
        <slot v-else name="edit"></slot>
      </div>
    </div>
  </div>
</template>

<style lang="less">
.rollbackable {
  .value-render {
    .ant-select,
    .ant-input {
      width: 100%;
    }
  }
}
</style>
