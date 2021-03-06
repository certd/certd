import Router from 'koa-router'
import { accessProviderRegistry } from '@certd/api'
import _ from 'lodash-es'
import { Ret } from '../models/Ret.js'
const router = Router()
router.prefix('/api/access-providers')

router.get('/list', function (ctx, next) {
  const list = []
  _.forEach(accessProviderRegistry.collection, item => {
    list.push(item.define())
  })
  ctx.body = Ret.success(list)
})

export default router
