<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-alert class="ml-1" type="info" message=" ↓↓↓ 通过cell字段插槽，可以做一些很复杂的显示" />
      </template>
      <template #cell_like="scope">
        <a-statistic title="自定义复杂显示" :value="scope.row.like" style="margin-right: 50px">
          <template #suffix>
            <like-outlined />
          </template>
        </a-statistic>
      </template>
      <template #cell_switch="scope">
        <fs-icon v-if="scope.row.switch" style="font-size: 16px; color: green" icon="ion:checkmark-circle-outline"></fs-icon>
        <fs-icon v-if="!scope.row.switch" style="font-size: 16px; color: red" icon="ion:close-circle-outline"></fs-icon>
      </template>
      <template #cell_createDate="scope">
        创建时间：{{ dateFormat(scope.row.createDate) }}<br />
        修改时间：{{ dateFormat(scope.row.updateDate) }}
      </template>

      <template #cell-rowHandle-left="scope">
        <a-button class="row-handle-btn" size="small" danger @click="showScope(scope)">rowHandle-left插槽</a-button>
      </template>
      <template #cell-rowHandle-middle="scope">
        <a-button class="row-handle-btn" size="small" danger @click="showScope(scope)">rowHandle-middle插槽</a-button>
      </template>
      <template #cell-rowHandle-right="scope">
        <a-button class="row-handle-btn" size="small" danger @click="showScope(scope)">rowHandle-right插槽</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import dayjs from "dayjs";
export default defineComponent({
  name: "SlotsCell",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, radioDict } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
    });

    function dateFormat(time, formatter = "YYYY-MM-DD") {
      return dayjs(time).format(formatter);
    }

    function showScope(scope) {
      console.log("scope", scope);
    }
    return {
      crudBinding,
      crudRef,
      radioDict,
      dateFormat,
      showScope
    };
  }
});
</script>
