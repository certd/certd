import Koa from 'koa'
import json from 'koa-json'
import onerror from 'koa-onerror'
import bodyparser from 'koa-bodyparser'
import logger from 'koa-logger'
import Static from 'koa-static'
import fs from 'fs'
import _ from 'lodash-es'
import './install.js'
import pathUtil from './utils/util.path.js'
import compress from 'koa-compress'
const app = new Koa()

// error handler
onerror(app)

// middlewares
app.use(bodyparser({
  enableTypes: ['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
// gzip
// app.use(compress({ threshold: 5120 }))

const staticPlugin = Static(pathUtil.join('public'), {
  maxage: 30 * 24 * 60 * 3600,
  gzip: true
})
app.use(staticPlugin)

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes
const files = fs.readdirSync(new URL('controllers/', import.meta.url))
// 过滤出.js文件:
const jsFiles = files.filter((f) => {
  return f.endsWith('.js')
})

_.forEach(jsFiles, async item => {
  let mapping = await import(new URL('controllers/' + item, import.meta.url))
  mapping = mapping.default
  app.use(mapping.routes(), mapping.allowedMethods())
})

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
})

console.log('http://localhost:3000/')
export default app
