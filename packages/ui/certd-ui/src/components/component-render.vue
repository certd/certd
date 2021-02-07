<script>
import { h, resolveComponent } from 'vue'
import _ from 'lodash-es'
export default {
  name: 'component-render',
  props: {
    name: {
      type: String,
      default: 'a-input'
    },
    children: {
      type: Array
    },
    on: {
      type: Object
    }
  },
  setup (props, context) {
    const attrs = {
      ...context.$attrs
    }
    _.forEach(props.on, (value, key) => {
      attrs[key] = value
      if (typeof value === 'string') {
        // eslint-disable-next-line no-eval
        attrs[key] = eval(value)
      }
    })
    const comp = resolveComponent(props.name)
    return () => h(comp, context.$attrs, props.children)
  }
}
</script>
