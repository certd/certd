import DContainer from './d-container'
import ComponentRender from './component-render'
import AccessProviderSelector from './access-provider-selector/access-provider-selector'

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
