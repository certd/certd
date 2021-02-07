import Router from 'koa-router'
import { dnsProviderRegistry } from '@certd/api'
import DefaultDnsProviders from '@certd/dns-providers'
import _ from 'lodash-es'
import { Ret } from '../models/Ret.js'
const router = Router()
router.prefix('/dns-providers')

DefaultDnsProviders.install()

router.get('/list', function (ctx, next) {
  const list = []
  _.forEach(dnsProviderRegistry.collection, item => {
    list.push(item.define())
  })
  ctx.body = Ret.success(list)
})

export default router
