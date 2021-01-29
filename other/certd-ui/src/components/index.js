import DContainer from './d-container'
import ComponentRender from './component-render'
import ProviderSelector from './provider-selector/provider-selector'

const list = [
  DContainer,
  ComponentRender,
  ProviderSelector
]
export default {
  install (app) {
    for (const item of list) {
      app.component(item.name, item)
    }
  }
}
