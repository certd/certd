<template>
  <a-config-provider :locale="locale">

    <a-layout class="page-layout">
      <a-layout-header>Cert-D</a-layout-header>
      <a-layout style="flex:1">
        <router-view/>
      </a-layout>
      <a-layout-footer>
         by greper
      </a-layout-footer>

    </a-layout>

  </a-config-provider>
</template>
<script>
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { useI18n } from 'vue-i18n'

export default {
  data () {
    return {
      locale: zhCN
    }
  },
  setup () {
    const { t } = useI18n() // call `useI18n`, and spread `t` from  `useI18n` returning
    return { t } // return render context that included `t`
  }
}
</script>
<style lang="less">
.page-layout{
  height: 100%;
  overflow-x: hidden;
  .ant-layout-header{
    color:#fff;
  }
}
</style>
