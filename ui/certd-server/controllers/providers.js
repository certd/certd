import Router from 'koa-router'
import { providerRegistry } from '@certd/api'
import DefaultProviders from '@certd/providers'
import _ from 'lodash-es'
import { Ret } from '../models/Ret.js'
const router = Router()
router.prefix('/providers')

DefaultProviders.install()

router.get('/list', function (ctx, next) {
  const list = []
  _.forEach(providerRegistry.providers, item => {
    list.push(item.define())
  })
  ctx.body = Ret.success(list)
})

export default router
