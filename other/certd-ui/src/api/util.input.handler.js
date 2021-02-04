import _ from 'lodash-es'

function handleInputs (inputs) {
  if (inputs == null) {
    return
  }
  _.forEach(inputs, (item, key) => {
    if (item.component?.required === true) {
      if (item.component.rules == null) {
        item.component.rules = []
      }
      if (item.component.rules.length > 0) {
        const hasRequired = item.rules.filter(rule => {
          return rule.required === true
        })
        if (hasRequired.length > 0) {
          return
        }
      }
      item.component.rules.push({ required: true, message: '该项必填' })
      delete item.component.required
    }
  })
}
export default {

  handle (list) {
    _.forEach(list, item => {
      handleInputs(item.input)
    })
  }

}
