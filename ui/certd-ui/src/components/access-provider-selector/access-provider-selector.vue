<template>
  <div class="access-provider-selector">
    <a-select
      :value="value"
      @update:value="valueUpdate"
      placeholder="没有可选时请点右边按钮添加"
    >
      <a-select-option v-for="item of getProviders()" :key="item.key" :value="item.key" :disabled="isDisabled(item)">
        {{ item.name }}
      </a-select-option>
    </a-select>
    <a-button class="suffix" @click="providerManagerOpen">
      添加授权
    </a-button>
  </div>
  <access-provider-manager ref="providerManagerRef"
                    :value="value"
                    :filter="filter"
                    @update:value="valueUpdate"
  ></access-provider-manager>

</template>
<script>
import { ref, inject } from 'vue'
import AccessProviderManager from './access-provider-manager'

export default {
  name: 'access-provider-selector',
  components: { AccessProviderManager },
  emits: ['update:providers', 'update:value'],
  // 属性定义
  props: {
    value: {
      type: String
    },
    filter: {}
  },
  setup (props, context) {
    const providerManagerRef = ref(null)
    const providerManagerOpen = () => {
      console.log('providerManagerRef', providerManagerRef)
      if (providerManagerRef.value) {
        providerManagerRef.value.open()
      }
    }
    const providersUpdate = (val) => {
      console.log('accessUpdate', val)
      context.emit('update:providers', val)
    }
    const valueUpdate = (val) => {
      context.emit('update:value', val)
    }

    const isDisabled = (item) => {
      if (!props.filter) {
        return false
      }
      return item.type !== props.filter
    }

    const getProviders = inject('get:accessProviders')

    return {
      providersUpdate,
      valueUpdate,
      providerManagerOpen,
      providerManagerRef,
      isDisabled,
      getProviders
    }
  }
}
</script>
<style lang="less">
.access-provider-selector{
  display: flex;
  flex-direction: row;
  .ant-select{
    flex:1;
  }
  .suffix{
    flex-shrink: 0;
    margin-left:5px;
  }
}
</style>
