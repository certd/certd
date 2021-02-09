import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { i18n } from './i18n'
import icons from './icons'
import antdv from './antdv'
import components from './components'
const app = createApp(App)
app.config.productionTip = false
app.use(i18n)
icons(app)
antdv(app)
// eslint-disable-next-line
import './style/common.less'
app.use(components)
app.use(router).mount('#app')
