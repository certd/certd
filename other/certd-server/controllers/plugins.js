import Router from 'koa-router'
import { pluginRegistry } from '@certd/api'
import DefaultPlugins from '@certd/plugins'
import _ from 'lodash-es'
import { Ret } from '../models/Ret.js'
const router = Router()
router.prefix('/plugins')

DefaultPlugins.install()

router.get('/list', function (ctx, next) {
  const list = []
  _.forEach(pluginRegistry.plugins, item => {
    list.push(item.define())
  })
  ctx.body = Ret.success(list)
})

export default router
