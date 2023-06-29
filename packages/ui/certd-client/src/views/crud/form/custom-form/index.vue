<template>
  <fs-page>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <template #actionbar-right>
        <a-divider type="vertical" />
        <a-button @click="openCustomForm">打开自定义表单对话框</a-button>
      </template>
    </fs-crud>
  </fs-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useCrud, useExpose, useColumns } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud";
import _ from "lodash-es";
import { message } from "ant-design-vue";
export default defineComponent({
  name: "FormCustomForm",
  setup(props, ctx) {
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

    // 自定义表单配置
    const { buildFormOptions } = useColumns();
    const customOptions = {
      columns: {
        customField: {
          title: "新表单字段",
          type: "text"
        },
        groupField: {
          title: "分组字段",
          type: "text"
        }
      },
      form: {
        wrapper: { title: "自定义表单" },
        group: {
          groups: {
            testGroupName: {
              header: "分组测试",
              columns: ["groupField"]
            }
          }
        },
        doSubmit({ form }) {
          console.log("form submit:", form);
          message.info("自定义表单提交:" + JSON.stringify(form));
          message.warn("抛出异常可以阻止表单关闭");
          throw new Error("抛出异常可以阻止表单关闭");
        }
      }
    };
    //使用crudOptions结构来构建自定义表单配置
    const formOptions = buildFormOptions(customOptions);

    //打开自定义表单
    const openCustomForm = () => {
      expose.getFormWrapperRef().open(formOptions);
    };

    return {
      crudBinding,
      crudRef,
      openCustomForm
    };
  }
});
</script>
