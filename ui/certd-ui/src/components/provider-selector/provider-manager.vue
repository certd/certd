<template>
  <a-drawer
    title="授权管理"
    placement="right"
    :closable="true"
    width="500px"
    v-model:visible="visible"
    :after-visible-change="onAfterVisibleChange"
  >
    <div class="d-container provider-manager">
      <a-button @click="add">
        添加授权
      </a-button>
        <a-list
          class="list"
          item-layout="horizontal"
          :data-source="getProviders()"
        >
          <template #renderItem="{ item ,index }">
            <a-list-item>
              <template #actions>
                  <a-button type="primary" @click="openEdit(item,index)"><template #icon><EditOutlined /></template></a-button>
                  <a-button type="danger" @click="remove(item,index)"><template #icon ><DeleteOutlined /></template></a-button>
              </template>

              <a-radio :disabled="isDisabled(item)" :checked="item.key===selectedKey" @update:checked="selectedKey = item.key" >
                 {{ item.name }} ({{item.type}})
              </a-radio>

            </a-list-item>
          </template>
        </a-list>

        <div>
          <a-button @click="onProviderSelectSubmit">确定</a-button>
        </div>
    </div>
  </a-drawer>

  <a-modal v-model:visible="editVisible" dialogClass="d-dialog" width="700px" title="编辑授权" @ok="onSubmit">

    <a-alert v-if="currentProvider?.desc" :message="currentProvider.desc" type="success" />

    <a-form ref="formRef" class="domain-form" :model="formData" labelWidth="150px" :label-col="labelCol" :wrapper-col="wrapperCol">
      <a-form-item label="类型" name="type" :rules="rules.type">
        <a-radio-group  :disabled="editIndex!=null" v-model:value="formData.type" @change="onTypeChanged" >
          <a-radio-button v-for="(option) of providerDefineList"  :disabled="isDisabled(option,'name')" :key="option.name" :value="option.name">
            {{option.label}}
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <template v-if="formData.type && currentProvider">
        <a-form-item label="名称" name="name" :rules="rules.name">
          <a-input v-model:value="formData.name"/>
        </a-form-item>
        <a-form-item v-for="(item,key,index) in currentProvider.input"
                     :key="index"
                     v-bind="item.component||{}"
                     :label="item.label || key"
                     :name="key">
          <component-render v-model:value="formData[key]" v-bind="item.component || {}"></component-render>
          <template #extra >
            <div v-if="item.desc" class="helper">{{item.desc}}</div>
          </template>
        </a-form-item>
      </template>

    </a-form>

  </a-modal>
</template>

<script>
import { ref, reactive, nextTick, watch, inject } from 'vue'
// eslint-disable-next-line no-unused-vars
import { useForm } from '@ant-design-vue/use'
import _ from 'lodash-es'
import providerApi from '@/api/api.providers'
function useEdit (props, context, onEditSave) {
  const formData = reactive({
    key: '',
    name: '',
    type: undefined
  })

  const rules = ref({
    type: [{
      type: 'string',
      required: true,
      message: '请选择类型'
    }],
    name: [{
      type: 'string',
      required: true,
      message: '请输入名称'
    }]
  })

  const formRef = ref()
  // eslint-disable-next-line no-unused-vars
  // const { resetFields, validate, validateInfos } = useForm(formData, rules)
  const onSubmit = async e => {
    e.preventDefault()
    const res = await formRef.value.validate()
    console.log('validation:', res)
    const newProvider = _.cloneDeep(formData)
    onEditSave(newProvider, editIndex.value)
    closeEdit()
  }

  const editVisible = ref(false)
  const editIndex = ref(null)
  const openEdit = (item, index) => {
    if (item) {
      editIndex.value = index
      _.forEach(formData, (value, key) => {
        formData[key] = null
      })
      _.merge(formData, item)
      changeType(item.type)
    } else {
      editIndex.value = null
      formData.type = null
    }
    editVisible.value = true
  }
  const add = () => {
    openEdit()
  }
  const closeEdit = () => {
    editVisible.value = false
  }
  const providerDefineList = ref([])
  const onCreated = async () => {
    providerDefineList.value = await providerApi.list()
  }
  onCreated()
  const currentProvider = ref(null)
  const onTypeChanged = (e) => {
    const value = e.target.value
    changeType(value)
    // 遍历input 设置到form rules
  }
  const changeType = (type) => {
    if (providerDefineList.value == null) {
      return
    }
    for (const item of providerDefineList.value) {
      if (item.name === type) {
        currentProvider.value = item
        break
      }
    }

    if (editIndex.value == null) {
      formData.key = currentProvider.value.name
      formData.name = currentProvider.value.label || currentProvider.value.name
    }
  }

  const isDisabled = (item, keyName = 'type') => {
    if (!props.filter) {
      return false
    }
    return item[keyName
    ] !== props.filter
  }
  return {
    labelCol: { span: 6 },
    wrapperCol: { span: 16 },
    formData,
    onSubmit,
    rules,
    editVisible,
    formRef,
    currentProvider,
    providerDefineList,
    editIndex,
    openEdit,
    onTypeChanged,
    add,
    isDisabled
  }
}

let index = 0
const keyPrefix = 'provider_'
function generateNewKey (list) {
  index++
  let exists = false
  for (const item of list) {
    if (item.key === keyPrefix + index) {
      exists = true
      break
    }
  }
  if (exists) {
    return generateNewKey(list)
  }
  return keyPrefix + index
}
export default {
  name: 'provider-manager',
  props: {
    value: {},
    filter: {}
  },
  emits: ['update:value'],
  setup (props, context) {
    const visible = ref(false)

    const close = () => {
      visible.value = false
    }

    const onAfterVisibleChange = () => {

    }

    const getProviders = inject('get:accessProviders')
    // const providerList = ref([])
    const selectedKey = ref(null)

    watch(() => props.value, () => {
      selectedKey.value = props.value
    }, { immediate: true })

    const onEditSave = (newProvider, editIndex) => {
      const providerList = getProviders()
      if (editIndex == null) {
        // add 生成一个key
        newProvider.key = generateNewKey(providerList)
        providerList.push(newProvider)
      } else {
        _.merge(providerList[editIndex], newProvider)
      }
    }

    const editModule = useEdit(props, context, onEditSave)

    const open = () => {
      visible.value = true
      const providerList = getProviders()
      if (providerList.length === 0) {
        nextTick(() => {
          editModule.add()
        })
      }
    }
    const remove = (item, index) => {
      const providerList = getProviders()
      providerList.splice(index, 1)
    }

    const updateProviders = inject('update:accessProviders')

    // watch(() => providers, () => {
    //   providerList.value = _.cloneDeep(props.providers || [])
    // }, { immediate: true })

    const onProviderSelectSubmit = () => {
      const providerList = getProviders()
      updateProviders(providerList)
      context.emit('update:value', selectedKey.value)
      close()
    }
    return {
      visible,
      open,
      close,
      onAfterVisibleChange,
      remove,
      selectedKey,
      onProviderSelectSubmit,
      getProviders,
      ...editModule
    }
  }
}
</script>

<style lang="less">
.provider-manager{
  padding:10px;
}
</style>
