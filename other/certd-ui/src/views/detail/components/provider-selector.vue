<template>
  <div class="provider-selector">
    <a-select
      :value="value"
      @update:value="valueUpdate"
    >
      <a-select-option v-for="item of providers" :key="item.key" :value="item.key">
        {{ item.name }}
      </a-select-option>
    </a-select>
    <a-button class="suffix" @click="providerManagerOpen">
      管理授权
    </a-button>
  </div>
  <provider-manager ref="providerManagerRef"
                    :providers="providers"
                    :value="value"
                    @update:value="valueUpdate"
                    @update:providers="providersUpdate"
  ></provider-manager>

</template>
<script>
import { ref } from 'vue'
import ProviderManager from './provider-manager'

export default {
  name: 'provider-selector',
  components: { ProviderManager },
  emits: ['update:providers', 'update:value'],
  // 属性定义
  props: {
    value: {
      type: String
    },
    providers: {
      type: Object
    }
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
    return {
      providersUpdate,
      valueUpdate,
      providerManagerOpen,
      providerManagerRef
    }
  }
}
</script>
<style lang="less">
.provider-selector{
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
