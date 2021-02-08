import Router from 'koa-router'
import { pluginRegistry } from '@certd/api'
import _ from 'lodash-es'
import { Ret } from '../models/Ret.js'
const router = Router()
router.prefix('/api/plugins')

router.get('/list', function (ctx, next) {
  const list = []
  _.forEach(pluginRegistry.collection, item => {
    list.push(item.define())
  })
  ctx.body = Ret.success(list)
})

export default router
