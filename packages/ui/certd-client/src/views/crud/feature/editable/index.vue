<template>
  <fs-page>
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

<script>
import { defineComponent, ref, onMounted } from "vue";
import createCrudOptions from "./crud";
import { useExpose, useCrud } from "@fast-crud/fast-crud";
import { message } from "ant-design-vue";
export default defineComponent({
  name: "FeatureEditable",
  setup() {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const { expose } = useExpose({ crudRef, crudBinding });
    // 你的crud配置
    const { crudOptions, selectedIds } = createCrudOptions({ expose });
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const { resetCrudOptions } = useCrud({ expose, crudOptions });
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    onMounted(() => {
      expose.doRefresh();
      expose.editable.enable({ mode: "free" });
    });

    function enable() {
      expose.editable.enable({ enabled: true, mode: "free" });
    }
    function disable() {
      expose.editable.disable();
    }

    return {
      crudBinding,
      crudRef,
      enabledChanged(event) {
        if (event) {
          enable();
        } else {
          disable();
        }
      },
      enable,
      disable,
      active() {
        expose.editable.active();
      },
      inactive() {
        expose.editable.inactive();
      },
      save() {
        expose.getTableRef().editable.submit(({ changed, removed, setData }) => {
          console.log("changed", changed);
          console.log("removed", removed);
          // setData({ 0: {id:1} }); //设置data
          message.success("保存,修改行：" + JSON.stringify(changed) + "；删除行：" + JSON.stringify(removed));
        });
      },
      cancel() {
        expose.editable.resume();
      },
      addRow() {
        expose.editable.addRow();
      },
      editCol() {
        expose.editable.editCol({ cols: ["radio"] });
      }
    };
  }
});
</script>
