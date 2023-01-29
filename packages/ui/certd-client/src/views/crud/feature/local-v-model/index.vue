<template>
  <fs-page>
    <template #header>
      <div class="title">
        将本地crud当做v-model,编辑好之后一并提交，你还可以使用行编辑模式，效果更好
      </div>
    </template>
    <div style="padding:30px">
      <a-form ref="formRef" :model="form" laba-width="120px">
        <a-form-item label="姓名">
          <a-input v-model:value="form.name"></a-input>
        </a-form-item>
        <a-form-item label="表格">
          <div style="min-height: 300px">
            <FeatureLocalModelValueInput v-model="form.data"/>
          </div>
        </a-form-item>
        <a-form-item >
          <a-button @click="submit">提交</a-button>
        </a-form-item>
      </a-form>

    </div>

  </fs-page>
</template>

<script>
import {defineComponent, reactive} from 'vue';
import {message} from 'ant-design-vue'
import FeatureLocalModelValueInput from './local.vue'
export default defineComponent({
  name: 'FeatureLocalVModel',
  components:{FeatureLocalModelValueInput},
  setup() {
    const form = reactive({
      name:'test',
      data: [{name:'初始数据'}],
    })

    function submit(){
      message.info("submit:"+JSON.stringify(form))
      console.log('submit:',form)
    }
    return {
      form,
      submit
    };
  },
});
</script>
