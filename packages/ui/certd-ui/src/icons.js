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

// 必须这么写。否则打包正式环境的时候显示不了图标
const icons = {
  PlusCircleOutlined: PlusCircleOutlined,
  PlusOutlined: PlusOutlined,
  CheckOutlined: CheckOutlined,
  EditOutlined: EditOutlined,
  ArrowRightOutlined: ArrowRightOutlined,
  NodeIndexOutlined: NodeIndexOutlined,
  ThunderboltOutlined: ThunderboltOutlined,
  DeleteOutlined: DeleteOutlined
}
export default function (app) {
  _.forEach(icons, (item, key) => {
    app.component(key, item)
  })
}
