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

<script lang="ts" setup>
import { onMounted } from "vue";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, useFsAsync, useFsRef, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { cloneDeep, find, merge, remove, maxBy } from "lodash-es";

//此处为crudOptions配置
const createCrudOptions = async function ({}: CreateCrudOptionsProps): Promise<CreateCrudOptionsRet> {
  //本地模拟后台crud接口方法 ----开始
  const records = [{ id: 1, name: "Hello World", type: 1 }];
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return {
      records: cloneDeep(records),
      offset: 0, //后续transformRes会计算为currentPage
      limit: 20, //后续transformRes会计算为pageSize
      total: records.length
    };
  };
  const editRequest = async ({ form, row }: EditReq) => {
    const target = find(records, (item) => {
      return row.id === item.id;
    });
    merge(target, form);
    return target;
  };
  const delRequest = async ({ row }: DelReq) => {
    remove(records, (item) => {
      return item.id === row.id;
    });
  };
  const addRequest = async ({ form }: AddReq) => {
    const maxRecord = maxBy(records, (item: any) => {
      return item.id;
    });
    form.id = (maxRecord?.id || 0) + 1;
    records.push(form);
    return form;
  };
  //本地模拟后台crud接口方法 -----结束

  return {
    //自定义变量返回
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      actionbar: {
        buttons: {
          add: {
            tooltip: {
              title: "tooltip演示"
            }
          }
        }
      },
      columns: {
        name: {
          title: "姓名",
          type: "text",
          search: { show: true },
          column: {
            resizable: true,
            width: 200,
            tooltip: {
              title: "tooltip演示"
            }
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
const { crudRef, crudBinding } = useFsRef();
// 自定义变量上下文, 将会传递给createCrudOptions, 比如直接把props,和ctx直接传过去使用
const context: any = {};

// 页面打开后获取列表数据
onMounted(async () => {
  const { crudExpose } = await useFsAsync({ crudRef, crudBinding, createCrudOptions, context });
  await crudExpose.doRefresh();
});
</script>
