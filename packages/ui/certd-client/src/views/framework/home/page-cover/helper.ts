export default {
  crud: `  columns: {
    date:{
      title: '姓名', //字段名称
      type: 'text', //字段类型，添加、修改、查询将自动生成相应表单组件
    },
    province: {
      title: '城市',
      type: 'dict-select', //选择框
      form: { //表单组件自定义配置，此处配置选择框为多选
        component: { //支持任何v-model组件
           filterable: true, multiple: true, clearable: true
        }
      },
      dict: dict({
        data: [ //本地数据字典
          { value: 'sz', label: '深圳' },
          { value: 'gz', label: '广州' },
          { value: 'wh', label: '武汉' },
          { value: 'sh', label: '上海' }
        ]
      })
    },
    status: {
      title: '状态',
      type: 'dict-select', //选择框，默认单选
      dict: dict({ url: '/dicts/OpenStatusEnum' })//远程数据字典
    },
  }
  `
};
