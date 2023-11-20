<template>
  <fs-page>
    <template #header>
      <div class="title">可编辑</div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/expose.html">文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <!--      <fs-button class="ml-1" @click="addRow">添加行</fs-button>-->
        <a-radio-group v-model:value="crudBinding.table.editable.enabled" class="ml-5">
          <a-radio-button :value="true">启用编辑</a-radio-button>
          <a-radio-button :value="false">退出编辑</a-radio-button>
        </a-radio-group>
        <!--            <a-radio-group class="ml-1" v-model="crudBinding.table.editable.mode">-->
        <!--              <a-radio-button label="free">自由模式</a-radio-button>-->
        <!--              <a-radio-button label="row">行编辑模式</a-radio-button>-->
        <!--            </a-radio-group>-->
        <template v-if="crudBinding.table.editable.enabled">
          <fs-button class="ml-5" @click="save">保存</fs-button>
          <fs-button class="ml-5" @click="log">log</fs-button>
        </template>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useFs } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";

export default defineComponent({
  name: "EditableFree",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      crudExpose.editable.enable({ mode: "free", activeDefault: true });
    });

    return {
      crudBinding,
      crudRef,
      active() {
        crudExpose.editable.active();
      },
      inactive() {
        crudExpose.editable.inactive();
      },
      async save() {
        const res = await crudExpose.editable.validate();
        if (res !== true) {
          console.error("validate error:", res);
          return;
        }
        message.success("保存,修改行：" + JSON.stringify(crudBinding.value.data));
      },
      log() {
        console.log("table data:", crudBinding.value.data, crudExpose.getTableData());
      },
      cancel() {
        crudExpose.editable.resume();
      },
      addRow() {
        crudExpose.editable.addRow();
      },
      editCol() {
        crudExpose.editable.activeCols({ cols: ["radio"] });
      }
    };
  }
});
</script>
