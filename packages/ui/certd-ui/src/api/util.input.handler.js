import _ from 'lodash-es'

function handleInputs (inputs) {
  if (inputs == null) {
    return
  }
  _.forEach(inputs, (item, key) => {
    if (item.required === true) {
      if (item.component == null) {
        item.component = {}
      }
      let rules = item.component.rules
      if (rules == null) {
        item.component.rules = rules = []
      }
      if (rules.length > 0) {
        const hasRequired = rules.filter(rule => {
          return rule.required === true
        })
        if (hasRequired.length > 0) {
          return
        }
      }
      rules.push({ required: true, message: '该项必填' })
      delete item.required
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
