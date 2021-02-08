import Router from 'koa-router'
import fs from 'fs'
import exportsService from '../service/exports-service.js'

const router = Router()
router.prefix('/api/exports')

router.post('/toZip', async function (ctx, next) {
  // const request = ctx.request
  // const query = request.query
  const body = ctx.request.body
  // const req_queryString = request.queryString
  const { zipPath, fileName } = await exportsService.exportsToZip(body.options, 'certd-run')

  console.log('zipFile', zipPath)
  ctx.set('Content-disposition', 'attachment;filename=' + fileName)
  ctx.set('Content-Type', 'application/zip')
  ctx.body = fs.createReadStream(zipPath)
  //
  // // ctx.body = Ret.success(zipPath)
})

export default router
