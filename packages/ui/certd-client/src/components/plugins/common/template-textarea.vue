<template>
  <div class="template-textarea">
    <a-textarea :value="value" v-bind="$attrs" @update:value="emit('update:value', $event)" />
    <div class="template-textarea__toolbar">
      <a-dropdown trigger="click">
        <a-button>
          <span class="template-textarea__selected">{{ selectedName }}</span>
          <fs-icon icon="ion:chevron-down" class="ml-1" />
        </a-button>
        <template #overlay>
          <a-menu @click="handleMenuClick">
            <a-menu-item v-for="item in templates" :key="item.id">
              <div class="template-textarea__menu-item">
                <span>{{ item.name }}</span
                ><a-button type="link" danger size="small" @click.stop="deleteTemplate(item.id)">删除</a-button>
              </div>
            </a-menu-item>
            <a-menu-item v-if="templates.length === 0" disabled>暂无模板</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="save">保存当前脚本为模板</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>
<script setup lang="ts">
import { notification } from "ant-design-vue";
import { onMounted, ref, watch } from "vue";
import { request } from "/@/api/service";
import { useProjectStore } from "/@/store/project";
import { useFormDialog } from "/@/use/use-dialog";
import { nanoid } from "nanoid";
defineOptions({ name: "TemplateTextarea", inheritAttrs: false });
const props = withDefaults(defineProps<{ value?: string; templateType?: string }>(), { value: "", templateType: "script" });
const emit = defineEmits<{ "update:value": [value: string] }>();
const templates = ref<Array<{ id: string; name: string; content: string }>>([]);
const selected = ref<string>();
const key = "script_templates";
const { openFormDialog } = useFormDialog();
const selectedName = ref("选择脚本模板");
async function load() {
  const entity = await request({ url: "/user/settings/get", method: "post", params: { key } });
  try {
    templates.value = entity?.setting ? JSON.parse(entity.setting)[props.templateType] || [] : [];
  } catch {
    templates.value = [];
  }
}
async function persist() {
  const entity = await request({ url: "/user/settings/get", method: "post", params: { key } });
  let setting: Record<string, unknown[]> = {};
  try {
    setting = entity?.setting ? JSON.parse(entity.setting) : {};
  } catch {
    setting = {};
  }
  setting[props.templateType] = templates.value;
  await request({
    url: "/user/settings/save",
    method: "post",
    data: {
      key,
      setting: JSON.stringify(setting),
    },
  });
}
function handleMenuClick({ key: id }: { key: string }) {
  if (id === "save") {
    saveTemplate();
    return;
  }
  const item = templates.value.find(template => template.id === id);
  if (item) {
    selected.value = item.id;
    selectedName.value = item.name;
    emit("update:value", item.content);
  }
}
async function saveTemplate() {
  if (!props.value?.trim()) {
    notification.warning({ message: "请输入脚本内容后再保存模板" });
    return;
  }
  await openFormDialog({
    title: "保存脚本模板",
    initialForm: { name: "" },
    columns: { name: { title: "模板名称", type: "text", form: { rules: [{ required: true, message: "请输入模板名称" }] } } },
    async onSubmit(form: { name: string }) {
      const name = form.name?.trim();
      if (!name) {
        notification.warning({ message: "请输入模板名称" });
        throw new Error("模板名称不能为空");
      }
      const id = nanoid();
      templates.value.push({ id, name, content: props.value });
      await persist();
      selected.value = id;
      selectedName.value = name;
      notification.success({ message: "模板保存成功" });
    },
  });
}
async function deleteTemplate(id: string) {
  templates.value = templates.value.filter(item => item.id !== id);
  if (selected.value === id) {
    selected.value = undefined;
    selectedName.value = "选择脚本模板";
  }
  await persist();
  notification.success({ message: "模板删除成功" });
}
watch(() => props.templateType, load);
onMounted(load);
</script>
<style lang="less">
.template-textarea__toolbar {
  display: flex;
  margin-top: 6px;
  align-items: center;
}
.template-textarea__selected {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
}
.template-textarea__menu-item {
  display: flex;
  min-width: 220px;
  justify-content: space-between;
  align-items: center;
}
</style>
