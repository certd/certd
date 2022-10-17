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

export default {
  data () {
    return {
      locale: zhCN
    }
  },
  setup () {
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
