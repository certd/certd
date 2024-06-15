<template>
  <fs-page>
    <template #header>
      <div class="title">table-select</div>
      <div class="more">
        <fs-label label="直接设置值">
          <fs-table-select v-model="value" :dict="singleDictRef" :create-crud-options="createCrudOptionsText" />
          <a-button @click="setValue"> 设置值 </a-button>
        </fs-label>

        <fs-label label="自定义插槽">
          【{{ value }}】
          <fs-table-select v-model="value" :dict="singleDictRef" :create-crud-options="createCrudOptionsText">
            <template #default="scope">
              <fs-button @click="scope.open()"> 选择 </fs-button>
            </template>
          </fs-table-select>
        </fs-label>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import createCrudOptionsText from "../text/crud";
import { defineComponent, onMounted, ref } from "vue";
import createCrudOptions from "./crud.js";
import { dict, useFs } from "@fast-crud/fast-crud";
import * as textTableApi from "/@/views/crud/component/text/api";

export default defineComponent({
  name: "ComponentTableSelect",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });

    const value = ref(null);

    const singleDictRef = dict({
      value: "id",
      label: "name",
      //重要，根据value懒加载数据
      getNodesByValues: async (values: any[]) => {
        return await textTableApi.GetByIds(values);
      }
    });
    function setValue() {
      value.value = 1;
    }
    return {
      crudBinding,
      crudRef,
      value,
      singleDictRef,
      createCrudOptionsText,
      setValue
    };
  }
});
</script>
