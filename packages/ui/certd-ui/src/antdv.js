import _ from 'lodash'
import {
  AutoComplete,
  Alert,
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Cascader,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Icon,
  Input,
  InputNumber,
  Layout,
  List,
  LocaleProvider,
  Modal,
  Radio,
  Rate,
  Row,
  Select,
  Switch,
  Tabs,
  Tag,
  TimePicker,
  Tooltip,
  Drawer,
  // ColorPicker,
  ConfigProvider,
  Descriptions,
  Space
} from 'ant-design-vue'

const list = {
  AutoComplete,
  Alert,
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Cascader,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Icon,
  Input,
  InputNumber,
  Layout,
  List,
  LocaleProvider,
  TimePicker,
  Modal,
  Radio,
  Rate,
  Row,
  Select,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Drawer,
  // ColorPicker,
  ConfigProvider,
  Descriptions,
  Space
}
export default function (app) {
  _.forEach(list, item => {
    app.use(item)

    // app.config.globalProperties.$message = message
    // app.config.globalProperties.$notification = notification
    app.config.globalProperties.$info = Modal.info
    app.config.globalProperties.$success = Modal.success
    app.config.globalProperties.$error = Modal.error
    app.config.globalProperties.$warning = Modal.warning
    app.config.globalProperties.$confirm = Modal.confirm
    app.config.globalProperties.$destroyAll = Modal.destroyAll
  })
}
