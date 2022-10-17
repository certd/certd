import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import './style/common.less'
import icons from './icons'
import components from './components'
const app = createApp(App)
icons(app)
app.use(Antd)
app.use(components)
app.use(router).mount('#app')
