<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message=" ← form表单字段插槽，可以做一些很复杂的输入" />
      </template>

      <template #form_topics="scope">
        <a-input-search
          v-for="(item, index) in scope.form.topics"
          :key="index"
          v-model:value="scope.form.topics[index]"
          :disabled="scope.mode === 'view'"
          class="mb-1"
          @search="removeTopic(index, scope.form, scope.key)"
        >
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

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
export default defineComponent({
  name: "SlotsForm",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    function addTopic(form, key) {
      if (form[key] == null) {
        form[key] = [];
      }
      form[key].push("");
    }
    function removeTopic(index, form, key) {
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
