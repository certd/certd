<template>
  <div class="plugin-inputs">
    <div class="actions mb-1">
      <a-button type="primary" @click="addNewField"> 添加 </a-button>
    </div>

    <div class="inputs">
      <div class="inputs-inner">
        <a-collapse v-model:active-key="activeKey">
          <a-collapse-panel v-for="(item, index) of inputs" :key="index">
            <template #header> {{ item.key }} ： {{ item.title }} </template>
            <a-form :label-col="{ style: { width: '80px' } }">
              <a-form-item label="字段名称">
                <a-input v-model:value="item.key" />
              </a-form-item>
              <a-form-item label="字段标题">
                <a-input v-model:value="item.title" />
              </a-form-item>
              <a-form-item label="字段说明">
                <a-input v-model:value="item.helper" />
              </a-form-item>
              <a-form-item label="默认值">
                <a-input v-model:value="item.value" />
              </a-form-item>
              <a-form-item label="必填">
                <a-switch v-model:checked="item.required" />
              </a-form-item>
              <a-form-item label="组件名称">
                <a-input v-model:value="item.component.name" />
              </a-form-item>
              <a-form-item label="组件vModel">
                <a-input v-model:value="item.component.vModel" />
              </a-form-item>
            </a-form>
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { inject, ref, toRef } from "vue";
const activeKey = ref([]);

const getPlugin: any = inject("get:plugin");
const pluginRef = getPlugin();
const inputs = toRef(pluginRef.value.metadata, "input");
if (!inputs.value) {
  inputs.value = {};
}
function addNewField() {
  inputs.value.push({
    key: "newKey",
    title: "字段名",
  });
  // const { openCrudFormDialog } = useFormWrapper();
  //
  // openCrudFormDialog({
  //   crudOptions: {
  //     form: {
  //       labelCol: { style: { width: "80px" } },
  //       wrapperCol: { span: 18 },
  //       wrapper: {
  //         title: "添加输入",
  //       },
  //       doSubmit({ form }: any) {
  //         const key = form.key;
  //         const title = form.title;
  //         inputs.value[key] = {
  //           key,
  //           title,
  //           component: {
  //             name: "a-input",
  //             vModel: "value",
  //           },
  //           helper: "",
  //           value: undefined,
  //           required: false,
  //         };
  //       },
  //     },
  //     columns: {
  //       key: {
  //         title: "字段名称",
  //         type: "text",
  //         form: {
  //           helper: "英文字段名称",
  //         },
  //       },
  //       title: {
  //         title: "字段标题",
  //         type: "text",
  //         form: {
  //           helper: "字段标题",
  //         },
  //       },
  //     },
  //   },
  // });
}

// function onComponentChange(item: any, value: any) {
//   if (!item) {
//     item.component = {};
//     return;
//   }
//   item.component = yaml.load(value);
// }
</script>

<style lang="less">
.plugin-inputs {
  display: flex;
  flex-direction: column;
  height: 100%;
  .actions {
  }
  .inputs {
    flex: 1;
    height: 100%;
    overflow: hidden;
    .inputs-inner {
      height: 100%;
      overflow-y: auto;
    }
  }
}
</style>
