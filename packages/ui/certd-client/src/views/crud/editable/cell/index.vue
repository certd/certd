<template>
  <fs-page>
    <template #header>
      <div class="title">
        单元格编辑
        <span class="sub">单元格修改确认后直接提交到后台</span>
      </div>
      <div class="more"></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <!--      <fs-button class="ml-1" @click="addRow">添加行</fs-button>-->
        <a-radio-group v-model:value="crudBinding.table.editable.enabled" class="ml-5">
          <a-radio-button :value="true">启用编辑</a-radio-button>
          <a-radio-button :value="false">退出编辑</a-radio-button>
        </a-radio-group>
        <fs-label label="排他式激活" class="ml-5" title="激活某个cell时，其他已激活的自动关闭，永远只有一个cell被激活">
          <a-switch v-model:checked="crudBinding.table.editable.exclusive" class="ml-5"> </a-switch>
        </fs-label>

        <fs-label label="排他式激活效果" class="ml-5" title="排他式激活时，将未关闭的自动保存还是取消">
          <a-radio-group v-model:value="crudBinding.table.editable.exclusiveEffect" class="ml-5">
            <a-radio-button value="cancel">自动取消</a-radio-button>
            <a-radio-button value="save">自动保存</a-radio-button>
          </a-radio-group>
        </fs-label>

        <template v-if="crudBinding.table.editable.enabled">
          <fs-button class="ml-5" @click="active">激活全部编辑</fs-button>
          <fs-button class="ml-5" @click="cancel">取消/恢复原状</fs-button>
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
  name: "EditableCell",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      //默认启用编辑
      crudExpose.editable.enable({});
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
      save() {
        crudExpose.getTableRef().editable.submit(({ changed, removed, setData }: any) => {
          console.log("changed", changed);
          console.log("removed", removed);

          console.log("table data:", crudBinding.value.data, crudExpose.getTableData());
          // setData({ 0: {id:1} }); //设置data
          message.success("保存,修改行：" + JSON.stringify(changed) + "；删除行：" + JSON.stringify(removed));
        });
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
