import DContainer from './d-container.vue'
import ComponentRender from './component-render.vue'
import AccessProviderSelector from './access-provider-selector/access-provider-selector.vue'

const list = [
  DContainer,
  ComponentRender,
  AccessProviderSelector
]
export default {
  install (app) {
    for (const item of list) {
      app.component(item.name, item)
    }
  }
}
