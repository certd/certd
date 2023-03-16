<template>
  <fs-page>
    <template #header>
      <div class="title">可编辑</div>
      <div class="more"><a target="_blank" href="http://fast-crud.docmirror.cn/api/expose.html">文档</a></div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <!--      <fs-button class="ml-1" @click="addRow">添加行</fs-button>-->
        <a-radio-group value="crudBinding.table.editable.enabled" class="ml-1" @update:value="enabledChanged">
          <a-radio-button :value="true">启用编辑</a-radio-button>
          <a-radio-button :value="false">退出编辑</a-radio-button>
        </a-radio-group>
        <!--            <a-radio-group class="ml-1" v-model="crudBinding.table.editable.mode">-->
        <!--              <a-radio-button label="free">自由模式</a-radio-button>-->
        <!--              <a-radio-button label="row">行编辑模式</a-radio-button>-->
        <!--            </a-radio-group>-->
        <template v-if="crudBinding.table.editable.enabled">
          <fs-button class="ml-1" @click="active">激活全部编辑</fs-button>

          <fs-button class="ml-1" @click="inactive">反激活全部</fs-button>
          <fs-button class="ml-1" @click="editCol">编辑列</fs-button>
          <fs-button class="ml-1" @click="cancel">取消/恢复原状</fs-button>
          <fs-button class="ml-1" @click="save">保存</fs-button>
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
  name: "FeatureEditable",
  setup() {
    const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
      crudExpose.editable.enable({ mode: "free" });
    });

    function enable() {
      crudExpose.editable.enable({ enabled: true, mode: "free" });
    }
    function disable() {
      crudExpose.editable.disable();
    }

    return {
      crudBinding,
      crudRef,
      enabledChanged(event: boolean) {
        if (event) {
          enable();
        } else {
          disable();
        }
      },
      enable,
      disable,
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
          // setData({ 0: {id:1} }); //设置data
          message.success("保存,修改行：" + JSON.stringify(changed) + "；删除行：" + JSON.stringify(removed));
        });
      },
      cancel() {
        crudExpose.editable.resume();
      },
      addRow() {
        crudExpose.editable.addRow();
      },
      editCol() {
        crudExpose.editable.editCol({ cols: ["radio"] });
      }
    };
  }
});
</script>
