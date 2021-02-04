<template>
  <a-drawer
    title="证书申请配置"
    placement="right"
    :closable="true"
    width="500px"
    v-model:visible="visible"
    :after-visible-change="afterVisibleChange"
  >

    <d-container>
      <a-form class="domain-form" :model="formData"  :scrollToFirstError="true" :label-col="labelCol" :wrapper-col="wrapperCol">

        <h3>域名信息</h3>
        <a-form-item :label="$t('domain')" v-bind="validateInfos.domains">
          <a-select
            mode="tags"
            :placeholder="$t('please.input.domain')"
            v-model:value="formData.domains"
            :open="false"
          ></a-select>
          <template #extra >
            例如：*.yourdomain.com，输入完成后回车，支持多个
          </template>
        </a-form-item>

        <a-form-item :label="$t('email')" v-bind="validateInfos.email">
          <a-input v-model:value="formData.email"/>
        </a-form-item>

        <a-form-item label="dns验证" v-bind="validateInfos['dnsProvider.type']">
         <a-select v-model:value="formData.dnsProvider.type" @change="onCurrentDnsProviderChanged">
           <a-select-option v-for="item of dnsProviderDefineList" :key="item.name"  :value="item.name">{{item.label}}</a-select-option>
         </a-select>
        </a-form-item>
        <template v-if="currentDnsProviderDefine">
          <a-form-item v-for="(item,key) in currentDnsProviderDefine.input"  v-bind="item.component || {}"  :key="key" :label="item.label" :name="key">
            <component-render v-model:value="formData.dnsProvider[key]" v-bind="item.component || {}"></component-render>
            <template #extra v-if="item.desc"  >
              {{item.desc}}
            </template>
          </a-form-item>
        </template>

        <a-form-item label="CA" v-bind="validateInfos.ca">
          <a-radio-group v-model:value="formData.ca" >
            <a-radio  value="LetEncrypt">
              LetEncrypt
            </a-radio>
          </a-radio-group>
        </a-form-item>

        <h3>CSR <span>必须全英文</span></h3>
        <a-form-item label="国家" v-bind="validateInfos['csr.country']">
          <a-input v-model:value="formData.csr.country"/>
        </a-form-item>

        <a-form-item label="省份" v-bind="validateInfos['csr.state']">
          <a-input v-model:value="formData.csr.state"/>
        </a-form-item>

        <a-form-item label="市区" v-bind="validateInfos['csr.locality']">
          <a-input v-model:value="formData.csr.locality"/>
        </a-form-item>
        <a-form-item label="组织" v-bind="validateInfos['csr.organization']">
          <a-input v-model:value="formData.csr.organization"/>
        </a-form-item>
        <a-form-item label="部门" v-bind="validateInfos['csr.organizationUnit']">
          <a-input v-model:value="formData.csr.organizationUnit"/>
        </a-form-item>
        <a-form-item label="联系人邮箱">
          <a-input v-model:value="formData.csr.emailAddress"/>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-form-item :wrapper-col="{ span: 14, offset: 4 }">
          <a-button type="primary" @click="onSubmit">
            确定
          </a-button>
        </a-form-item>
      </template>

    </d-container>

  </a-drawer>
</template>
<script>
import { reactive, toRaw, ref, watch } from 'vue'
import { useForm } from '@ant-design-vue/use'
import dnsProviderApi from '@/api/api.dns-providers'
import _ from 'lodash-es'

function useDrawer () {
  const visible = ref(false)
  const afterVisibleChange = (val) => {
    console.log('visible', val)
  }
  const open = () => {
    visible.value = true
  }
  const close = () => {
    visible.value = false
  }
  return {
    afterVisibleChange,
    open,
    close,
    visible
  }
}

export default {
  name: 'cert-form',
  emits: ['update:accessProviders', 'update:cert'],
  // 属性定义
  props: {
    cert: {
      type: Object
    },
    accessProviders: {
      type: Object
    }
  },
  setup (props, context) {
    const drawer = useDrawer()

    const certFormData = {
      domains: [],
      email: undefined,
      dnsProvider: {},
      ca: 'LetEncrypt',
      csr: {
        country: '',
        state: 'GuangDong',
        locality: 'ShengZhen',
        organization: 'CertD Org.',
        organizationUnit: 'IT Department',
        emailAddress: undefined
      }
    }
    const formData = reactive(certFormData)
    watch(props.cert, () => {
      console.log('cert props')
      _.merge(formData, props.cert)
    }, { immediate: true })

    const rules = reactive({
      domains: [{
        type: 'array',
        required: true,
        message: '请输入域名'
      }],
      email: [{
        type: 'email',
        required: true,
        message: '请输入正确的邮箱'
      }],
      'dnsProvider.type': [{
        required: true,
        message: '请选择dns类型'
      }],
      'dnsProvider.accessProvider': [{
        required: true,
        message: '请选择dns授权提供者'
      }],
      'csr.country': [{ required: true, message: '请输入国家代码' }],
      'csr.state': [{ required: true, message: '请输入省份' }],
      'csr.locality': [{ required: true, message: '请输入市区' }],
      'csr.organization': [{ required: false, message: '请输入组织名称' }],
      'csr.organizationUnit': [{ required: false, message: '请输入部门名称' }],
      'csr.emailAddress': [{ required: false, message: '请输入邮箱' }]
    })
    // eslint-disable-next-line no-unused-vars
    const { resetFields, validate, validateInfos } = useForm(formData, rules)

    const onSubmit = async e => {
      e.preventDefault()
      try {
        const res = await validate()
        console.log('validation', res, toRaw(formData))

        context.emit('update:cert', formData)
        console.log('1111')
        drawer.close()
      } catch (err) {
        console.error('表单校验错误', err)
      }
    }
    const reset = () => {
      resetFields()
    }

    const providerManagerRef = ref(null)
    const providerManagerOpen = () => {
      console.log('providerManagerRef', providerManagerRef)
      if (providerManagerRef.value) {
        providerManagerRef.value.open()
      }
    }
    const accessProvidersUpdate = (val) => {
      console.log('accessUpdate', val)
      context.emit('update:accessProviders', val)
    }

    const dnsProviderDefineList = ref()
    const currentDnsProviderDefine = ref()
    const onCreate = async () => {
      const list = await dnsProviderApi.list()
      dnsProviderDefineList.value = list
    }
    const onCurrentDnsProviderChanged = (type) => {
      if (type == null) {
        return
      }
      formData.dnsProvider.type = type
      formData.dnsProvider.accessProvider = null
      for (const item of dnsProviderDefineList.value) {
        if (item.name === type) {
          currentDnsProviderDefine.value = item
          return
        }
      }
    }
    onCreate()

    return {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 },
      formData,
      onSubmit,
      reset,
      validateInfos,
      providerManagerRef,
      providerManagerOpen,
      accessProvidersUpdate,
      dnsProviderDefineList,
      onCurrentDnsProviderChanged,
      currentDnsProviderDefine,
      ...drawer
    }
  }
}
</script>
<style lang="less">
.ant-form.domain-form {
  height: 100%;
  overflow-y: auto;
  padding: 10px 24px;

  h3 {
    span {
      font-weight: 200;
      margin-left: 5px;
      font-size: 12px;
      color: #888;
    }
  }

}
</style>
