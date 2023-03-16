<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message=" ← form表单字段插槽，可以做一些很复杂的输入" />
      </template>

      <template #form_topics="scope">
        <a-input-search v-for="(item, index) in scope.form.topics" :key="index" v-model:value="scope.form.topics[index]" :disabled="scope.mode === 'view'" class="mb-1" @search="removeTopic(index, scope.form, scope.key)">
          <template #enterButton>
            <a-button :disabled="scope.mode === 'view'">
              <DeleteOutlined />
            </a-button>
          </template>
        </a-input-search>
        <a-button :disabled="scope.mode === 'view'" @click="addTopic(scope.form, scope.key)">添加主题</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose, useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
export default defineComponent({
  name: "SlotsForm",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    function addTopic(form: any, key: string) {
      if (form[key] == null) {
        form[key] = [];
      }
      form[key].push("");
    }
    function removeTopic(index: number, form: any, key: string) {
      form[key].splice(index, 1);
    }
    return {
      crudBinding,
      crudRef,
      addTopic,
      removeTopic
    };
  }
});
</script>
