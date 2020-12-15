import fs from 'fs'
export class AbstractPlugin {
  async executeFromContextFile (options = {}) {
    const { contextPath } = options
    const contextJson = fs.readFileSync(contextPath)
    const context = JSON.parse(contextJson)
    const newContext = await this.execute(options, context)
    fs.writeFileSync(JSON.stringify(newContext || context))
  }

  async execute (options, context) {
    console.log('请实现此方法,context:', context)
    return context
  }


}
