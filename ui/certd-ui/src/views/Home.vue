<template>
  <div class="page-index flex-center">
    <H2 class="title">CERT-D</H2>
    <div class="page-body">

      <a-tabs @change="callback">
        <a-tab-pane key="1" tab="创建新证书">
          <div class="create-from-domains">
            <div class="input-row flex-row">
              <a-select
                size="large"
                mode="tags"
                :placeholder="$t('please.input.domain')"
                v-model:value="formData.cert.domains"
                :open="false"
              ></a-select>
              <div class="row-append">
                <a-button size="large" type="primary" @click="createFromDomain">创建新证书</a-button>
              </div>

            </div>
            <div class="helper">
              支持泛域名（例如*.test.yourdomain.com）<br/>
              支持多个域名打包到一张证书（输入一个域名后回车，再输下一个）
            </div>
          </div>

        </a-tab-pane>
        <a-tab-pane key="2" tab="从配置导入" force-render>
          <a-textarea v-model:value="optionsText" class="textarea" type="textarea" :auto-size="autoSize" allow-clear></a-textarea>
          <a-button class="mt-10" type="primary" @click="createFromText">导入</a-button>
        </a-tab-pane>
      </a-tabs>
    </div>

  </div>

</template>
<script>
// eslint-disable-next-line no-unused-vars
import { reactive, toRaw, ref } from 'vue'
import { useRouter } from 'vue-router'
export default {
  setup () {
    const formData = reactive({
      cert: {
        domains: ['*.docmirror.cn'],
        email: 'xiaojunnuo@qq.com',
        dnsProvider: 'aliyun'
      }
    })
    const router = useRouter()
    const createFromDomain = () => {
      goToDetail(JSON.stringify(formData))
    }

    const goToDetail = (options) => {
      router.push({ name: 'detail', params: { options } })
    }
    const autoSize = reactive({ minRows: 8, maxRows: 10 })

    const optionsText = ref()

    const createFromText = () => {
      try {
        JSON.parse(optionsText.value)
      } catch (e) {
        throw new Error('json格式有误', e)
      }
      goToDetail(optionsText.value)
    }

    return {
      createFromDomain,
      formData,
      autoSize,
      optionsText,
      createFromText
    }
  }
}
</script>
<style lang="less">
.page-index{
  background-color: #fff;
  height: 100%;
  &.flex-center{
    justify-content: flex-start;
  }

  .title{
    margin:50px;
  }
  .page-body{
    min-width: 700px;width: 60%
  }
  .create-from-domains{
    width:100%;
    .input-row{
      width:100%;
      .ant-select{
        flex:1;
      }
      .row-append{
        padding-left:10px
      }
    }
  }
  .helper{
    margin-top:5px;
  }

  .ant-tabs-bar {
    margin: 0 0 16px;
    border-bottom: 1px solid #f0f0f0;
    outline: none;
  }
}

</style>
