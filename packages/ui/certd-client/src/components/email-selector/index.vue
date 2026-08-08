<template>
  <a-select :options="emails">
    <template #option="{ value: val }">
      <div class="flex flex-row w-full">
        <span class="flex-1">{{ val }}</span>
        <fs-icon class="ml-5" icon="ion:close" @click="deleteItem(val)"></fs-icon>
      </div>
    </template>
    <template #dropdownRender="{ menuNode: menu }">
      <v-nodes :vnodes="menu" />
      <a-divider style="margin: 4px 0" />
      <div class="w-full flex flex-row p-5">
        <a-input ref="inputRef" v-model:value="newEmail" class="flex-1" placeholder="添加新邮箱" @keydown.enter="addItem" />
        <a-button class="ml-5" type="primary" @click="addItem">
          <template #icon>
            <plus-outlined />
          </template>
          添加邮箱
        </a-button>
      </div>
    </template>
  </a-select>
</template>

<script lang="ts" setup>
import { defineComponent, onMounted, ref } from "vue";
import * as api from "./api";
import { Modal, notification } from "ant-design-vue";
defineOptions({
  name: "EmailEditor",
});
const props = defineProps<{}>();
const VNodes = defineComponent({
  props: {
    vnodes: {
      type: Object,
      required: true,
    },
  },
  render() {
    return this.vnodes;
  },
});

const newEmail = ref("");
const emails = ref([]);

onMounted(async () => {
  const list = await api.EmailList();
  emails.value = list.map((item: string) => {
    return {
      value: item,
    };
  });
});
async function addItem() {
  const email = newEmail.value;
  //验证邮箱格式
  const regExp =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+\.)+[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]{2,}))$/;
  if (!regExp.test(email)) {
    notification.error({
      message: "请填写正确的邮箱地址",
    });
    return;
  }

  if (emails.value.find(item => item.value === email)) {
    notification.warning({
      message: "此邮箱已存在",
    });
    return;
  }
  await api.EmailAdd(email);
  emails.value.unshift({
    value: email,
    label: email,
  });
  newEmail.value = "";
}

async function deleteItem(value: string) {
  Modal.confirm({
    title: "删除邮箱",
    content: "确定要删除此邮箱吗？",
    onOk: async () => {
      await api.EmailDelete(value);
      emails.value = emails.value.filter(item => item.value !== value);
    },
  });
}
</script>
