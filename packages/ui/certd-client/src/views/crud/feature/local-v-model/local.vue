<template>
  <fs-crud ref="crudRef" v-bind="crudBinding"/>
</template>

<script>
import {defineComponent, ref, onMounted, watch} from 'vue';
import createCrudOptions from './crud';
import {useExpose, useCrud} from '@fast-crud/fast-crud';

export default defineComponent({
  name: 'FeatureLocalModelValueInput',
  props: {
    modelValue: {
      default() {
        return []
      }
    }
  },
  setup(props) {
    // crud组件的ref
    const crudRef = ref();
    // crud 配置的ref
    const crudBinding = ref();
    // 暴露的方法
    const {expose} = useExpose({crudRef, crudBinding});
    // 你的crud配置
    const {crudOptions} = createCrudOptions({expose});
    // 初始化crud配置
    // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
    const {resetCrudOptions} = useCrud({expose, crudOptions});
    // 你可以调用此方法，重新初始化crud配置
    // resetCrudOptions(options)

    // 页面打开后获取列表数据
    // onMounted(() => {
    //   expose.doRefresh();
    // });

    //通过导出modelValue, 可以导出成为一个input组件
    watch(() => {
      return props.modelValue
    }, (value = []) => {
      crudBinding.value.data = value
    }, {
      immediate: true
    })


    // 通过crudBinding.value.data 可以获取表格实时数据
    function showData() {
      console.log('data:', crudBinding.value.data)
    }


    return {
      crudBinding,
      crudRef,
      showData,
    };
  },
});
</script>
<style lang="less">
.fs-crud-container.compact .el-table--border {
  border-left: 1px solid #eee;
}
</style>
