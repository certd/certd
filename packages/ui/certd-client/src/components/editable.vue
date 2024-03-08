<template>
  <div class="pi-editable" :class="{ disabled, 'hover-show': hoverShow }">
    <div v-if="isEdit" class="input">
      <a-input ref="inputRef" v-model:value="valueRef" :validate-status="modelValue ? '' : 'error'" v-bind="input" @keyup.enter="save()" @blur="save()">
        <template #suffix>
          <fs-icon icon="ant-design:check-outlined" @click="save()"></fs-icon>
        </template>
      </a-input>
    </div>
    <div v-else class="view" @click="edit">
      <span> {{ modelValue }}</span>
      <fs-icon class="edit-icon" icon="ant-design:edit-outlined"></fs-icon>
    </div>
  </div>
</template>

<script>
import { watch, ref, nextTick } from "vue";

export default {
  name: "PiEditable",
  props: {
    modelValue: {
      type: String,
      default: ""
    },
    input: {
      type: Object
    },
    disabled: {
      type: Boolean,
      default: false
    },
    hoverShow: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue"],
  setup(props, ctx) {
    const inputRef = ref();
    const valueRef = ref(props.modelValue);
    watch(
      () => {
        return props.modelValue;
      },
      (value) => {
        valueRef.value = value;
      }
    );
    const isEdit = ref(false);
    async function edit() {
      if (props.disabled) {
        return;
      }
      isEdit.value = true;
      await nextTick();
      inputRef.value.focus();
    }
    function save() {
      isEdit.value = false;
      ctx.emit("update:modelValue", valueRef.value);
    }
    return {
      valueRef,
      isEdit,
      save,
      edit,
      inputRef
    };
  }
};
</script>

<style lang="less">
.pi-editable {
  flex: 1;
  line-height: 34px;

  span.fs-iconify {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin-left: 2px;
    margin-right: 2px;
  }

  &.disabled {
    .edit-icon {
      visibility: hidden !important;
    }
  }
  &.hover-show {
    .edit-icon {
      visibility: hidden;
    }
    &:hover {
      .edit-icon {
        visibility: visible;
      }
    }
  }
  .edit-icon {
    line-height: 34px;
  }
  .view {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: left;
  }
}
</style>
