import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import './style/common.less'
import { i18n } from './i18n'
import icons from './icons'
import components from './components'
const app = createApp(App)
app.config.productionTip = false
app.use(i18n)
app.use(Antd)
icons(app)
app.use(components)
app.use(router).mount('#app')
