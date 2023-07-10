<template>
  <fs-page>
    <template #header>
      <div class="title">HelloWorld</div>
      <div class="more">
        <a target="_blank" href="http://fast-crud.docmirror.cn/guide/start/integration.html">文档</a>
      </div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding" />
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from "vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useCrud, useFs, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import _ from "lodash-es";

//此处为crudOptions配置
const createCrudOptions = function ({}: CreateCrudOptionsProps): CreateCrudOptionsRet {
  //本地模拟后台crud接口方法 ----开始
  const records = reactive([{ id: 1, name: "Hello World", type: 1 }]);
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return {
      records,
      offset: 0, //后续transformRes会计算为currentPage
      limit: 20, //后续transformRes会计算为pageSize
      total: records.length
    };
  };
  const editRequest = async ({ form, row }: EditReq) => {
    const target = _.find(records, (item) => {
      return row.id === item.id;
    });
    _.merge(target, form);
    return target;
  };
  const delRequest = async ({ row }: DelReq) => {
    _.remove(records, (item) => {
      return item.id === row.id;
    });
  };
  const addRequest = async ({ form }: AddReq) => {
    const maxRecord = _.maxBy(records, (item) => {
      return item.id;
    });
    form.id = (maxRecord?.id || 0) + 1;
    records.push(form);
    return form;
  };
  //本地模拟后台crud接口方法 -----结束

  return {
    //自定义变量返回
    customExport: {},
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      columns: {
        name: {
          title: "姓名",
          type: "text",
          search: { show: true },
          column: {
            resizable: true,
            width: 200
          }
        },
        type: {
          title: "类型",
          type: "dict-select",
          dict: dict({
            data: [
              { value: 1, label: "开始" },
              { value: 0, label: "停止" }
            ]
          })
        }
      }
    }
  };
};

//此处为组件定义
export default defineComponent({
  name: "FsCrudHelloWorld",
  setup() {
    // // crud组件的ref
    // const crudRef: Ref = ref();
    // // crud 配置的ref
    // const crudBinding: Ref<CrudBinding> = ref();
    // // 暴露的方法
    // const { crudExpose } = useExpose({ crudRef, crudBinding });
    // // 你的crud配置
    // const { crudOptions, customExport } = createCrudOptions({ crudExpose, context });
    // // 初始化crud配置
    // const { resetCrudOptions, appendCrudBinding } = useCrud({ crudExpose, crudOptions });

    //  =======以上为fs的初始化代码=========
    //  =======你可以简写为下面这一行========
    const { crudRef, crudBinding, crudExpose, context } = useFs({ createCrudOptions, context: {} });

    // 页面打开后获取列表数据
    onMounted(() => {
      crudExpose.doRefresh();
    });
    return {
      crudBinding,
      crudRef
    };
  }
});
</script>
