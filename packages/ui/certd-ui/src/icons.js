import _ from 'lodash'
import {
  PlusCircleOutlined,
  PlusOutlined,
  CheckOutlined, EditOutlined,
  ArrowRightOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'

const icons = {
  PlusCircleOutlined,
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  ArrowRightOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  DeleteOutlined
}
export default function (app) {
  _.forEach(icons, item => {
    console.log('icons:', item.name)
    app.component(item.name, item)
  })
}
